// Resume → profile fields. Runs entirely in the browser (options page), nothing is uploaded.
//   AA_extractText(file)  → Promise<string>   (PDF via bundled pdf.js, DOCX via built-in unzip, TXT)
//   AA_parseResume(text)  → { fieldKey: value }  (only the fields it could find)

(function () {
  // ---- Text extraction --------------------------------------------------------------------
  async function extractText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return pdfText(await file.arrayBuffer());
    if (name.endsWith('.docx')) return docxText(await file.arrayBuffer());
    if (name.endsWith('.txt') || file.type.startsWith('text/')) return file.text();
    throw new Error('Unsupported file type. Use PDF, DOCX or TXT.');
  }

  async function pdfText(buffer) {
    const pdfjs = globalThis.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: buffer, isEvalSupported: false }).promise;
    const out = [];
    const links = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const { items } = await page.getTextContent();
      // Rebuild lines: group text items by their vertical position, then sort left → right.
      const rows = [];
      for (const it of items) {
        if (!it.str || !it.str.trim()) continue;
        const x = it.transform[4];
        const y = it.transform[5];
        let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, (it.height || 10) * 0.5));
        if (!row) rows.push((row = { y, parts: [] }));
        row.parts.push({ x, w: it.width || 0, s: it.str });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const row of rows) {
        row.parts.sort((a, b) => a.x - b.x);
        let line = '';
        let end = null;
        for (const part of row.parts) {
          const gap = end === null ? 0 : part.x - end;
          line += end === null ? part.s : gap > 15 ? '  |  ' + part.s : gap > 1 ? ' ' + part.s : part.s;
          end = part.x + part.w;
        }
        out.push(line);
      }
      // Clickable icons ("LinkedIn", "GitHub") often hide the URL in a link annotation.
      for (const a of await page.getAnnotations()) if (a.url) links.push(a.url);
    }
    return out.join('\n') + (links.length ? '\n' + links.join('\n') : '');
  }

  // DOCX is a zip; read word/document.xml (and hyperlink targets) with the native DecompressionStream.
  async function docxText(buffer) {
    const files = await unzip(buffer, ['word/document.xml', 'word/_rels/document.xml.rels']);
    const xml = files['word/document.xml'];
    if (!xml) throw new Error('Not a valid DOCX file.');
    const decode = (s) =>
      s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    const text = decode(
      xml
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
    );
    const rels = files['word/_rels/document.xml.rels'] || '';
    const links = [...rels.matchAll(/Target="(https?:[^"]+)"[^>]*TargetMode="External"/g)].map((m) => decode(m[1]));
    return text + (links.length ? '\n' + links.join('\n') : '');
  }

  async function unzip(buffer, wanted) {
    const view = new DataView(buffer);
    let eocd = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not a valid DOCX file.');
    const count = view.getUint16(eocd + 10, true);
    let ptr = view.getUint32(eocd + 16, true);
    const result = {};
    for (let n = 0; n < count; n++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;
      const method = view.getUint16(ptr + 10, true);
      const size = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const local = view.getUint32(ptr + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(buffer, ptr + 46, nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;
      if (!wanted.includes(name)) continue;
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      let bytes = new Uint8Array(buffer, start, size);
      if (method === 8) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      }
      result[name] = new TextDecoder().decode(bytes);
    }
    return result;
  }

  // ---- Parsing ----------------------------------------------------------------------------
  const SECTIONS = {
    summary: ['summary', 'professional summary', 'profile', 'professional profile', 'about me', 'about', 'objective', 'career objective', 'career summary'],
    experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'internships', 'internship experience', 'relevant experience', 'experience and internships'],
    education: ['education', 'academic background', 'academics', 'education and training', 'academic qualifications', 'educational qualifications'],
    skills: ['skills', 'technical skills', 'core skills', 'key skills', 'skills and tools', 'technologies', 'tech stack', 'core competencies', 'skills and interests', 'technical expertise', 'skill set', 'skillset'],
    other: ['projects', 'personal projects', 'academic projects', 'certifications', 'certificates', 'achievements', 'awards', 'honors', 'honours', 'publications', 'languages', 'interests', 'hobbies', 'contact', 'references', 'activities', 'extracurricular activities', 'volunteer', 'volunteering', 'leadership', 'positions of responsibility', 'courses', 'coursework', 'relevant coursework', 'awards and achievements', 'personal details'],
  };
  const headingOf = (line) => {
    const t = line.toLowerCase().replace(/[^a-z& ]+/g, ' ').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    if (!t || line.length > 45) return null;
    for (const [sec, names] of Object.entries(SECTIONS)) if (names.includes(t)) return sec;
    return null;
  };

  const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const DATE = `(?:${MONTH}\\.?,?\\s*|(\\d{1,2})[/.-])?((?:19|20)\\d{2})`;
  const RANGE_RE = new RegExp(`${DATE}\\s*(?:-|\u2013|\u2014|to|until)\\s*(?:${DATE}|(present|current|now|till date|to date|ongoing))`, 'gi');
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const TITLE_RE = /\b(engineer|developer|intern|manager|analyst|designer|consultant|scientist|lead|architect|specialist|associate|administrator|officer|director|executive|coordinator|programmer|researcher|technician|founder|co-founder|head|vp|president|assistant|trainee|sde|devops|representative|accountant|teacher|instructor|writer|editor|strategist|product owner|scrum master)\b/i;
  const SEP_RE = /\s+[|\u2022\u00b7\u25e6\u25aa\u2666\u2013\u2014]\s+|\s{2,}|\t|\s+-\s+|\s+at\s+|\s*\|\s*/;
  const SEP_NO_AT_RE = new RegExp(SEP_RE.source.replace('|\\s+at\\s+', ''));
  const BULLET_RE = /^\s*[\u2022\u25cf\u25aa\u25e6\u2023\-*\u2013]\s*/;
  const COUNTRIES = ['india', 'united states', 'usa', 'us', 'united kingdom', 'uk', 'canada', 'germany', 'australia', 'singapore', 'france', 'netherlands', 'ireland', 'uae', 'united arab emirates', 'japan', 'china', 'spain', 'italy', 'sweden', 'switzerland', 'new zealand', 'brazil', 'mexico', 'south africa', 'nigeria', 'kenya', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'philippines', 'indonesia', 'malaysia', 'vietnam', 'poland', 'portugal', 'israel'];

  function parseResume(raw) {
    const text = raw.replace(/\r/g, '').replace(/[ \u00a0]+/g, ' ');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const f = {};

    // Split into sections by headings; everything before the first heading is the header.
    const sections = { header: [] };
    let current = 'header';
    for (const line of lines) {
      const h = headingOf(line.replace(/:$/, ''));
      if (h) { current = h; sections[h] = sections[h] || []; continue; }
      (sections[current] = sections[current] || []).push(line);
    }
    const top = sections.header.length ? sections.header : lines.slice(0, 8);

    // Contact details
    const email = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
    if (email) f.email = email[0];
    const noEmails = text.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, ' ');
    for (const m of noEmails.matchAll(/\+?\(?\d[\d\s().-]{8,}\d/g)) {
      const digits = m[0].replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}\s*[-\u2013]\s*(19|20)\d{2}$/.test(m[0].trim())) { f.phone = m[0].trim(); break; }
    }
    const url = (re) => { const m = noEmails.match(re); return m ? (/^https?:/i.test(m[0]) ? m[0] : 'https://' + m[0]).replace(/[.,;)]+$/, '') : ''; };
    f.linkedin = url(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[^\s|,)]+/i);
    f.github = url(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9-]+(?![\w/-]*\.\w)/i);
    f.twitter = url(/(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i);
    const sites = [...noEmails.matchAll(/https?:\/\/[^\s|,)]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|dev|me|net|org|app|xyz|in|co|tech|site|page|ai|vercel\.app|netlify\.app|github\.io)(?:\/[^\s|,)]*)?/gi)]
      .map((m) => m[0])
      .filter((u) => !/linkedin\.|github\.com|twitter\.|x\.com|gmail\.|outlook\.|yahoo\.|hotmail\./i.test(u));
    if (sites.length) f.portfolio = /^https?:/i.test(sites[0]) ? sites[0] : 'https://' + sites[0];

    // Name: first header line that looks like 2–4 words of letters
    for (const line of top.slice(0, 6)) {
      const candidate = line.split(SEP_RE)[0].trim();
      if (/^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*){1,3}$/.test(candidate) && !headingOf(candidate) && !TITLE_RE.test(candidate)) {
        const name = candidate === candidate.toUpperCase() ? candidate.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : candidate;
        const parts = name.split(/\s+/);
        f.fullName = name;
        f.firstName = parts[0];
        f.lastName = parts[parts.length - 1];
        if (parts.length === 3) f.middleName = parts[1];
        break;
      }
    }

    // Location: a "City, Region[, Country]" segment in the header
    for (const line of top) {
      for (const seg of line.split(SEP_RE)) {
        const s = seg.trim().replace(/^[^A-Za-z]+/, '');
        const m = s.match(/^([A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]+){0,2}),\s*([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+){0,2}|[A-Z]{2})(?:,\s*([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+){0,2}))?$/);
        if (!m || /@|\d/.test(s)) continue;
        f.location = s;
        f.city = m[1];
        if (COUNTRIES.includes(m[2].toLowerCase())) f.country = m[2];
        else f.state = m[2];
        if (m[3]) f.country = m[3];
        break;
      }
      if (f.location) break;
    }

    // Summary & skills: the section text
    if (sections.summary) f.summary = sections.summary.join(' ').slice(0, 1500);
    if (sections.skills) f.skills = sections.skills.map((l) => l.replace(BULLET_RE, '')).join('\n').slice(0, 1000);

    // Experience: total years from date ranges, current company/title from the first entry
    if (sections.experience) {
      const exp = sections.experience;
      const intervals = [];
      for (const line of exp) {
        for (const m of line.matchAll(RANGE_RE)) {
          const start = toMonth(m[1], m[2], m[3]);
          const end = m[7] ? toMonth(null, null, String(new Date().getFullYear()), new Date().getMonth()) : toMonth(m[4], m[5], m[6], 11);
          if (end >= start) intervals.push([start, end]);
        }
      }
      if (intervals.length) {
        intervals.sort((a, b) => a[0] - b[0]);
        let months = 0;
        let [s, e] = intervals[0];
        for (const [a, b] of intervals.slice(1)) {
          if (a <= e + 1) e = Math.max(e, b);
          else { months += e - s + 1; [s, e] = [a, b]; }
        }
        months += e - s + 1;
        f.experienceYears = String(Math.round((months / 12) * 10) / 10);
      }

      const head = [];
      for (const line of exp) {
        if (BULLET_RE.test(line) || line.split(/\s+/).length > 14) { if (head.length) break; continue; }
        head.push(line);
        if (head.length >= 3) break;
      }
      const segments = head
        .flatMap((l) => l.replace(RANGE_RE, ' | ').split(SEP_RE))
        .map((s) => s.trim().replace(/^[,(]+|[,)]+$/g, '').trim())
        .filter((s) => s && /[A-Za-z]/.test(s) && !/^(remote|hybrid|on-?site|full[- ]time|part[- ]time|internship|contract)$/i.test(s))
        .filter((s) => !/^[A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]+)*,\s*[A-Z][A-Za-z]+/.test(s) || TITLE_RE.test(s)) // drop "City, Country"
        .filter((s) => !new RegExp(`^${MONTH}\\.?\\s*$`, 'i').test(s));
      const title = segments.find((s) => TITLE_RE.test(s) && s.split(/\s+/).length <= 7);
      const company = segments.find((s) => s !== title && s.split(/\s+/).length <= 6);
      if (title) f.currentTitle = title;
      if (company) f.currentCompany = company.replace(/,.*$/, '').trim();
    }

    // Education: first entry
    if (sections.education) {
      const edu = sections.education;
      const uniIdx = edu.findIndex((l) => /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|bits)\b/i.test(l));
      if (uniIdx >= 0) {
        const seg = edu[uniIdx].replace(RANGE_RE, ' | ').split(SEP_NO_AT_RE).find((s) => /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|bits)\b/i.test(s));
        f.university = (seg || edu[uniIdx]).replace(/\s*\(?\b(19|20)\d{2}\b.*$/, '').replace(/,\s*$/, '').trim();
      }
      const DEG_LONG = /\b((?:bachelor|master)(?:'s|s)?(?:\s+of\s+[a-z]+(?:\s+[a-z]+)?)?|associate(?:'s)?\s+(?:of|in)\s+[a-z]+|doctor(?:ate)? of philosophy|diploma)\b/i;
      const DEG_SHORT = /\b(B\.?\s?Tech|B\.?E\.?|B\.?Sc?\.?|B\.?A\.?|BCA|BBA|B\.?Com|M\.?\s?Tech|M\.?E\.?|M\.?Sc?\.?|M\.?A\.?|MCA|MBA|M\.?Com|Ph\.?\s?D\.?)(?=[\s,(\-\u2013|:]|$)/;
      const start = Math.max(0, uniIdx - 2);
      const window = edu.slice(start, start + 5);
      for (const line of window) {
        const m = line.match(DEG_LONG) || line.match(DEG_SHORT);
        if (!m) continue;
        f.degree = m[1].replace(/\s+in$/i, '').trim();
        const rest = line.slice(m.index + m[0].length);
        const mj = rest.match(/^\s*(?:in|,|-|\u2013|\(|:)\s*([A-Za-z&][A-Za-z&.\s]*?[A-Za-z.])\s*(?=[,|()\-\u2013]|\d|$)/);
        if (mj && !/\b(university|college|institute|school)\b/i.test(mj[1])) f.major = mj[1].trim();
        break;
      }
      const years = window.join(' ').match(/\b(19|20)\d{2}\b/g);
      if (years) f.gradYear = String(Math.max(...years.map(Number)));
      const gpa = window.join(' ').match(/\b(?:c?gpa|cpi|grade)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)(\s*\/\s*\d+(?:\.\d+)?)?/i) ||
        window.join(' ').match(/\b(\d(?:\.\d+)?)(\s*\/\s*(?:4|5|10)(?:\.0+)?)\b/);
      if (gpa) f.gpa = (gpa[1] + (gpa[2] || '')).replace(/\s+/g, '');
      else {
        const pct = window.join(' ').match(/\b(\d{2}(?:\.\d+)?)\s*%/);
        if (pct) f.gpa = pct[1] + '%';
      }
    }

    for (const k of Object.keys(f)) if (!f[k]) delete f[k];
    return f;
  }

  function toMonth(monthName, monthNum, year, fallback = 0) {
    let m = fallback;
    if (monthName) m = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase());
    else if (monthNum) m = Math.min(11, Math.max(0, Number(monthNum) - 1));
    return Number(year) * 12 + m;
  }

  // ---- AI parsing via Groq (optional, used when an API key is set) -----------------------
  // Questions a resume doesn't answer; leaving them out stops the model from guessing.
  const AI_SKIP = ['hearAbout', 'coverLetter', 'workAuth', 'sponsorship', 'relocate', 'ethnicity', 'veteran', 'disability'];

  const EMPTY_RE = /^(n\/?a|none|null|unknown|not (specified|mentioned|provided))$/i;

  async function parseResumeAI(text, apiKey, model) {
    const fields = (globalThis.AA_FIELDS || []).filter((f) => !AI_SKIP.includes(f.key) && !f.list);
    const schema = fields.map((f) => `- ${f.key}: ${f.label}${f.hint ? ` (${f.hint})` : ''}`).join('\n');
    const today = new Date().toISOString().slice(0, 10);
    const levelIds = (globalThis.AA_EDU_LEVELS || []).map((l) => `"${l.id}" (${l.label})`).join(', ');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `You extract details from a resume to pre-fill job application forms. Today is ${today}.\n` +
              `Return a single JSON object. These keys take plain string values:\n${schema}\n\n` +
              'These keys take arrays:\n' +
              '- work: every job and internship, most recent first, as {company, title, location, start, end, current, description}. ' +
              'Dates as "MM/YYYY" (or "YYYY" if only the year is given). current is true for an ongoing job, with end left empty. description: 1-3 sentences.\n' +
              '- education: every degree and school, most recent first, as {level, institution, board, degree, major, start, end, grade}. ' +
              `level is one of: ${levelIds}. Dates as "MM/YYYY" or "YYYY". Keep grade as written, e.g. "8.7/10" or "92%".\n` +
              '- links: profile links not covered by the string keys (e.g. LeetCode, Kaggle, Behance, Medium), as {label, url}.\n\n' +
              'Rules:\n' +
              '- Only include information explicitly stated in the resume. Omit a key rather than guess.\n' +
              '- experienceYears: total professional experience in years as a number like "3.5", from the job dates ("Present" = today), counting overlapping periods once.\n' +
              '- location: "City, State/Region, Country" as far as known. city/state/country separately too.\n' +
              '- skills: comma-separated list. summary: the summary/objective text, or a 2-3 sentence professional summary if none is written.\n' +
              '- Links as full https:// URLs.',
          },
          { role: 'user', content: text.slice(0, 30000) },
        ],
      }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error.message || msg; } catch (e) { /* keep status */ }
      throw new Error(msg);
    }
    const data = await res.json();
    const raw = JSON.parse(data.choices[0].message.content);
    const out = {};
    for (const f of fields) {
      let v = raw[f.key];
      if (Array.isArray(v)) v = v.join(', ');
      if (v === null || v === undefined || typeof v === 'object') continue;
      v = String(v).trim();
      if (v && !EMPTY_RE.test(v)) out[f.key] = v;
    }
    const str = (v) => (v === null || v === undefined || typeof v === 'object' || EMPTY_RE.test(String(v).trim()) ? '' : String(v).trim());
    const list = (arr, keys) =>
      (Array.isArray(arr) ? arr : [])
        .filter((e) => e && typeof e === 'object')
        .map((e) => Object.fromEntries(keys.map((k) => [k, k === 'current' ? e[k] === true || e[k] === 'true' : str(e[k])])))
        .filter((e) => keys.some((k) => k !== 'current' && e[k]));
    out.work = list(raw.work, ['company', 'title', 'location', 'start', 'end', 'current', 'description']);
    out.education = list(raw.education, ['level', 'institution', 'board', 'degree', 'major', 'start', 'end', 'grade']);
    const levels = new Set((globalThis.AA_EDU_LEVELS || []).map((l) => l.id));
    out.education.forEach((e) => { if (!levels.has(e.level)) e.level = 'other'; });
    out.links = list(raw.links, ['label', 'url']).filter((l) => /^https?:\/\//i.test(l.url));
    for (const k of ['work', 'education', 'links']) if (!out[k].length) delete out[k];
    return out;
  }

  globalThis.AA_extractText = extractText;
  globalThis.AA_parseResume = parseResume;
  globalThis.AA_parseResumeAI = parseResumeAI;
})();
