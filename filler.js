// Injected into every frame of the active tab. Defines AA_fill(profile, settings, resume),
// which background.js calls with the saved data. Returns { filled } for this frame.
// Written to be safely re-injectable (no top-level const/let).
globalThis.AA_fill = function (profile, settings, resume) {
  const FIELDS = globalThis.AA_FIELDS || [];
  const AUTOCOMPLETE = globalThis.AA_AUTOCOMPLETE || {};
  const overwrite = !!(settings && settings.overwrite);

  // Only for name/id attributes ("firstName" -> "first Name"); labels keep words like "LinkedIn" intact.
  const splitCamel = (s) => String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  // ---- Build the list of values to fill -------------------------------------------------
  const values = Object.assign({}, (profile && profile.fields) || {});
  for (const k of Object.keys(values)) values[k] = String(values[k] || '').trim();
  if (!values.fullName && (values.firstName || values.lastName)) {
    values.fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');
  }
  if (values.fullName && !values.firstName && !values.lastName) {
    const parts = values.fullName.split(/\s+/);
    values.firstName = parts[0];
    values.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  }

  // Work / Education entries. Older saves kept the current job and degree as single fields.
  const clean = (list) => (list || []).filter((e) => e && Object.values(e).some((v) => String(v || '').trim()));
  let work = clean(profile && profile.work);
  if (!work.length && (values.currentCompany || values.currentTitle)) work = [{ company: values.currentCompany, title: values.currentTitle }];
  let education = clean(profile && profile.education);
  if (!education.length && values.university) {
    education = [{ institution: values.university, degree: values.degree, major: values.major, end: values.gradYear, grade: values.gpa }];
  }
  const LEVELS = globalThis.AA_EDU_LEVELS || [];
  const schoolLevel = (e) => LEVELS.find((l) => l.school && l.id === e.level);
  const higherEd = education.filter((e) => !schoolLevel(e));
  const LISTS = { work, education: higherEd.length ? higherEd : education };
  const yearOf = (v) => (String(v || '').match(/(19|20)\d{2}/) || [''])[0];
  const entryValue = (f, e) => {
    if (f.attr === 'end' && e.current) return f.month ? 'present' : '';
    const v = String(e[f.attr] || '').trim();
    return f.year ? yearOf(v) : v;
  };

  // A def has keywords plus either one `value`, or `values` (one per entry, used in form order).
  // `req` keywords must also appear in the question (e.g. "12th") for the def to be considered.
  const defs = [];
  for (const f of FIELDS) {
    if (f.list) {
      const vals = LISTS[f.list].map((e) => entryValue(f, e));
      if (vals.some(Boolean)) defs.push({ key: f.key, kw: f.kw.map(norm), values: vals, month: !!f.month });
    } else if (values[f.key]) {
      defs.push({ key: f.key, kw: f.kw.map(norm), value: values[f.key] });
    }
  }
  for (const e of education) {
    const level = schoolLevel(e);
    if (!level) continue;
    for (const [attr, kw] of Object.entries(globalThis.AA_SCHOOL_ATTRS || {})) {
      const v = attr === 'end' ? yearOf(e.end) : String(e[attr] || '').trim();
      if (v) defs.push({ key: `edu${level.id}_${attr}`, kw: kw.map(norm), req: level.kw.map(norm), value: v });
    }
  }
  // Custom fields added to any section: the field name is the keyword (commas allow several).
  Object.values((profile && profile.extra) || {}).flat().forEach((x, i) => {
    const kw = String((x && x.label) || '').split(',').map(norm).filter(Boolean);
    const v = String((x && x.value) || '').trim();
    if (kw.length && v) defs.push({ key: 'extra' + i, kw, value: v });
  });
  ((profile && profile.custom) || []).forEach((c, i) => {
    const kw = String(c.question || '').split(',').map(norm).filter(Boolean);
    const answer = String(c.answer || '').trim();
    if (kw.length && answer) defs.push({ key: 'custom' + i, kw, value: answer });
  });
  const byKey = Object.fromEntries(defs.map((d) => [d.key, d]));

  const bestMatch = (text) => scoredMatch(text).d;

  // Returns the best def for a piece of text and its score (0 = no match).
  function scoredMatch(text) {
    const t = ' ' + norm(text) + ' ';
    if (t.trim() === '') return { d: null, score: 0 };
    let best = null;
    let bestScore = 0;
    const longest = (kws) => kws.reduce((m, k) => (k.length > m && t.includes(' ' + k + ' ') ? k.length : m), 0);
    for (const d of defs) {
      let score = longest(d.kw);
      if (!score) continue;
      if (d.req) {
        const r = longest(d.req);
        if (!r) continue;
        score += 100 + r; // naming the level ("12th marks") beats the generic match ("marks")
      }
      if (score > bestScore) {
        best = d;
        bestScore = score;
      }
    }
    return { d: best, score: bestScore };
  }

  // ---- Reading what a field is asking ---------------------------------------------------
  const CONTROL_SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), select, textarea';
  const text = (n) => (n && (n.innerText || n.textContent) || '').trim();

  function labelTexts(el) {
    const parts = [];
    if (el.id) {
      try {
        document.querySelectorAll('label[for="' + CSS.escape(el.id) + '"]').forEach((l) => parts.push(text(l)));
      } catch (e) { /* ignore */ }
    }
    const wrap = el.closest('label');
    if (wrap) parts.push(text(wrap));
    const lb = el.getAttribute('aria-labelledby');
    if (lb) lb.split(/\s+/).forEach((id) => parts.push(text(document.getElementById(id))));
    parts.push(el.getAttribute('aria-label'));
    return parts.filter(Boolean);
  }

  function strongText(el) {
    return [...labelTexts(el), el.getAttribute('placeholder'), el.getAttribute('title'), splitCamel(el.name), splitCamel(el.id)].filter(Boolean).join(' | ');
  }

  // Text of the nearest ancestor that contains only this one question.
  // For radios, `group` is every radio in the group; the ancestor must contain all of them.
  function containerText(el, group) {
    let node = el.parentElement;
    for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
      if (group && !group.every((r) => node.contains(r))) continue;
      const controls = [...node.querySelectorAll(CONTROL_SEL)].filter((c) => !group || !group.includes(c));
      if (controls.length > (group ? 0 : 1)) return '';
      let t = text(node);
      // A dropdown's own options ("-- Select --") aren't the question; strip them and keep climbing.
      if (el.tagName === 'SELECT') for (const o of el.options) t = t.replace(o.text.trim(), ' ');
      t = t.trim();
      if (t) return t.slice(0, 300);
    }
    return '';
  }

  function matchFor(el) {
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop();
    if (AUTOCOMPLETE[ac] && byKey[AUTOCOMPLETE[ac]]) return byKey[AUTOCOMPLETE[ac]];
    // Labels and attributes usually say the most, but a terse name like "ctc_exp" or "li_url" can give a
    // weak match ("ctc", "url") while the visible text beside the field ("Expected CTC") is more specific.
    const strong = scoredMatch(strongText(el));
    const near = scoredMatch(containerText(el));
    return (near.score > strong.score ? near.d : strong.d) || null;
  }

  // ---- Writing values -------------------------------------------------------------------
  function visible(el) {
    if (!el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none';
  }

  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value); // bypasses React's value tracking so the change is registered
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function highlight(el) {
    const prev = el.style.boxShadow;
    el.style.boxShadow = '0 0 0 2px #22c55e';
    setTimeout(() => { el.style.boxShadow = prev; }, 2500);
  }

  function pickOption(options, value, getText) {
    const t = norm(value);
    if (!t) return null;
    const list = options.map((o) => ({ o, n: norm(getText(o)) })).filter((x) => x.n);
    return (
      list.find((x) => x.n === t) ||
      list.find((x) => x.n.startsWith(t + ' ') || t.startsWith(x.n + ' ')) ||
      (t.length >= 2 ? list.find((x) => x.n.includes(t)) : null) ||
      null
    );
  }

  // Dates are saved as typed ("MM/YYYY" or "YYYY"); convert for month / date inputs.
  function formatMonth(v, type) {
    if (v === 'present') return type === 'month' || type === 'date' ? '' : 'Present';
    const m = String(v).match(/^(\d{1,2})[/.-](\d{4})$/) || String(v).match(/^(\d{4})-(\d{1,2})$/);
    const [mm, yyyy] = m ? (m[1].length === 4 ? [m[2], m[1]] : [m[1], m[2]]) : ['01', yearOf(v)];
    if (!yyyy) return type === 'month' || type === 'date' ? '' : v;
    const mm2 = String(mm).padStart(2, '0');
    if (type === 'month') return `${yyyy}-${mm2}`;
    if (type === 'date') return `${yyyy}-${mm2}-01`;
    return v;
  }

  // For list-backed defs: how many times each has matched so far, so the 2nd "Company" field gets job 2.
  const used = {};
  function valueFor(d, el) {
    if (!d.values) return d.value;
    const i = used[d.key] || 0;
    used[d.key] = i + 1;
    const v = d.values[i] || '';
    return d.month ? formatMonth(v, (el.type || '').toLowerCase()) : v;
  }

  let filled = 0;

  // Text inputs, textareas, selects
  const SKIP_TYPES = new Set(['password', 'checkbox', 'radio', 'file', 'search', 'color', 'range']);
  for (const el of document.querySelectorAll(CONTROL_SEL)) {
    const type = (el.type || '').toLowerCase();
    if (SKIP_TYPES.has(type) || el.disabled || el.readOnly || !visible(el)) continue;
    const isSelect = el instanceof HTMLSelectElement;
    const isEmpty = isSelect ? el.selectedIndex <= 0 || !el.value : !el.value;

    // Match before the empty check, so already-filled job fields still count toward the entry order.
    const d = matchFor(el);
    if (!d) continue;
    const value = valueFor(d, el);
    if ((!isEmpty && !overwrite) || !value) continue;

    if (isSelect) {
      const hit = pickOption([...el.options].filter((o) => o.value !== ''), value, (o) => o.text || o.value);
      if (!hit || el.value === hit.o.value) continue;
      setNativeValue(el, hit.o.value);
    } else {
      if (type === 'number' && isNaN(parseFloat(value))) continue;
      if (type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
      setNativeValue(el, type === 'number' ? String(parseFloat(value)) : value);
    }
    highlight(el);
    filled++;
  }

  // Radio groups (e.g. "Are you authorized to work?" Yes / No)
  const groups = new Map();
  for (const r of document.querySelectorAll('input[type=radio]')) {
    if (r.disabled) continue;
    const key = r.name || (r.closest('fieldset, [role=radiogroup]') || r.parentElement);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const radios of groups.values()) {
    if (!radios.some(visible) && !radios.some((r) => r.closest('label') && visible(r.closest('label')))) continue;
    if (radios.some((r) => r.checked) && !overwrite) continue;
    const first = radios[0];
    const box = first.closest('fieldset, [role=radiogroup]');
    let question = '';
    if (box) {
      question = text(box.querySelector('legend')) || box.getAttribute('aria-label') || '';
      const lb = box.getAttribute('aria-labelledby');
      if (!question && lb) question = lb.split(/\s+/).map((id) => text(document.getElementById(id))).join(' ');
    }
    const d = bestMatch(question) || bestMatch(containerText(first, radios)) || bestMatch(splitCamel(first.name));
    if (!d) continue;
    const optionText = (r) => labelTexts(r).join(' ') || text(r.nextElementSibling) || r.value;
    const hit = pickOption(radios, d.values ? d.values[0] : d.value, optionText);
    if (!hit || hit.o.checked) continue;
    hit.o.click();
    if (!hit.o.checked) { hit.o.checked = true; hit.o.dispatchEvent(new Event('change', { bubbles: true })); }
    highlight(hit.o.closest('label') || hit.o);
    filled++;
  }

  // Resume upload
  if (resume && resume.data) {
    for (const el of document.querySelectorAll('input[type=file]')) {
      if (el.disabled || (el.files && el.files.length && !overwrite)) continue;
      const desc = ' ' + norm(strongText(el) + ' ' + containerText(el)) + ' ';
      if (!/ (resume|cv|curriculum vitae) /.test(desc) || / cover /.test(desc)) continue;
      try {
        const bin = atob(resume.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], resume.name, { type: resume.type || 'application/octet-stream' }));
        el.files = dt.files;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } catch (e) { /* some sites block programmatic uploads */ }
    }
  }

  return { filled };
};
