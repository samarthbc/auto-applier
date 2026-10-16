const form = document.getElementById('profile');
const customBox = document.getElementById('custom');
const statusEl = document.getElementById('status');
let resume = null; // { name, type, data (base64) }
let dirty = false;

// ---- Sections -----------------------------------------------------------------------------
const ICONS = {
  'quick-start': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  personal: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  address: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  links: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  education: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  eligibility: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  answers: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  resume: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
// Profile groups from fields.js → sidebar id, label and description.
const GROUPS = {
  Personal: { id: 'personal', label: 'Personal', desc: 'Your name and contact details.' },
  Address: { id: 'address', label: 'Address', desc: 'Where you live. Used for address and location questions.' },
  Links: { id: 'links', label: 'Links', desc: 'Profiles and websites employers ask for.' },
  Work: { id: 'work', label: 'Work', desc: 'Your jobs, experience and pay expectations.' },
  Education: { id: 'education', label: 'Education', desc: 'Your degrees and schools.' },
  'Eligibility & other': { id: 'eligibility', label: 'Eligibility', desc: 'Common screening questions. Write answers the way forms offer them, e.g. Yes or No.' },
};
const groupOf = (f) => GROUPS[f.group] || { id: f.group.toLowerCase().replace(/\W+/g, '-'), label: f.group, desc: '' };

const navItems = document.getElementById('navItems');
const sections = []; // { id, label }

function navButton(id, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nav-item';
  b.dataset.target = id;
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] || ICONS.personal}</svg><span></span><span class="nav-count"></span>`;
  b.querySelector('span').textContent = label;
  b.addEventListener('click', () => show(id));
  navItems.append(b);
  sections.push({ id, label });
}

function show(id) {
  if (!document.querySelector(`[data-panel="${id}"]`)) id = 'quick-start';
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== id; });
  navItems.querySelectorAll('.nav-item').forEach((b) => b.setAttribute('aria-current', String(b.dataset.target === id)));
  document.querySelector('.main').scrollTop = 0;
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
}

// ---- Render profile fields, one panel per group ---------------------------------------------
function renderFields() {
  const groups = {};
  for (const f of AA_FIELDS) (groups[f.group] ||= []).push(f);

  navButton('quick-start', 'Quick start');
  const sep = document.createElement('div');
  sep.className = 'nav-sep';
  navItems.append(sep);

  for (const [name, allFields] of Object.entries(groups)) {
    const g = groupOf(allFields[0]);
    const fields = allFields.filter((f) => !f.list); // list fields live in the Work / Education entries
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.dataset.panel = g.id;
    panel.hidden = true;
    panel.innerHTML = `
      <div class="panel-head">
        <div class="panel-title"><h1></h1><span class="chip"></span></div>
        <p></p>
      </div>
      <div class="grid"></div>`;
    panel.querySelector('h1').textContent = g.label;
    panel.querySelector('p').textContent = g.desc;
    const grid = panel.querySelector('.grid');
    if (ENTRY_TYPES[g.id]) grid.before(renderEntryBlock(g.id, fields.length > 0));
    if (fields.length && ENTRY_TYPES[g.id]) grid.insertAdjacentHTML('beforebegin', '<h2 class="subhead">Other details</h2>');
    if (!fields.length) grid.remove();
    for (const f of fields) {
      const wrap = document.createElement('div');
      wrap.className = 'field' + (f.type === 'textarea' ? ' wide' : '');
      const label = document.createElement('label');
      label.htmlFor = 'f-' + f.key;
      label.textContent = f.label;
      const input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (input.tagName === 'INPUT') input.type = ['email', 'tel', 'url'].includes(f.type) ? f.type : 'text';
      input.id = 'f-' + f.key;
      input.name = f.key;
      if (f.hint) input.placeholder = f.hint;
      wrap.append(label, input);
      grid.append(wrap);
    }
    panel.append(renderExtraBlock(g.id));
    form.append(panel);
    navButton(g.id, g.label);
  }

  const sep2 = document.createElement('div');
  sep2.className = 'nav-sep';
  navItems.append(sep2);
  navButton('answers', 'Answers');
  navButton('resume', 'Resume');
  navButton('settings', 'Settings');
}

// ---- Repeatable entries (Work experience, Education) -----------------------------------------
const ENTRY_TYPES = {
  work: {
    heading: 'Experience',
    hint: 'Add each job, most recent first. On forms with several job sections, job 1 goes into the first, job 2 into the second, and so on.',
    add: '+ Add experience',
    empty: 'No experience added yet. Add your jobs and internships here.',
    title: (e) => [e.title, e.company].filter(Boolean).join(' · ') || 'New experience',
    fields: [
      { k: 'company', label: 'Company' },
      { k: 'title', label: 'Job title' },
      { k: 'location', label: 'Location', ph: 'e.g. Bengaluru' },
      { k: 'start', label: 'Start', ph: 'MM/YYYY' },
      { k: 'end', label: 'End', ph: 'MM/YYYY' },
      { k: 'current', label: 'I currently work here', type: 'checkbox' },
      { k: 'description', label: 'Description', type: 'textarea', wide: true, ph: 'What you did, in a few lines' },
    ],
  },
  education: {
    heading: 'Education',
    hint: 'Add each degree and school, most recent first, e.g. B.Tech, PU / 12th and 10th. Questions like "12th percentage" or "PU college" use the matching level.',
    add: '+ Add education',
    empty: 'No education added yet.',
    title: (e) => [e.degree || levelLabel(e.level), e.institution].filter(Boolean).join(' · ') || 'New education',
    fields: [
      { k: 'level', label: 'Level', type: 'select' },
      { k: 'institution', label: 'School / College' },
      { k: 'degree', label: 'Degree / Course', ph: 'e.g. B.Tech, PCMB' },
      { k: 'major', label: 'Field of study / Stream', ph: 'e.g. Computer Science' },
      { k: 'board', label: 'Board / University', ph: 'e.g. CBSE, VTU' },
      { k: 'grade', label: 'Grade', ph: 'e.g. 8.7/10 or 92%' },
      { k: 'start', label: 'Start', ph: 'MM/YYYY' },
      { k: 'end', label: 'End / Passing year', ph: 'MM/YYYY or YYYY' },
    ],
  },
};
const levelLabel = (id) => (AA_EDU_LEVELS.find((l) => l.id === id) || {}).label || '';
const ICON_UP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

function renderEntryBlock(type, withHeading) {
  const t = ENTRY_TYPES[type];
  const block = document.createElement('div');
  block.className = 'entry-block';
  block.innerHTML = `
    ${withHeading ? `<h2 class="subhead">${t.heading}</h2>` : ''}
    <p class="muted"></p>
    <div class="entries" data-entries="${type}"></div>
    <p class="entries-empty"></p>
    <button type="button" class="btn add-entry"></button>`;
  block.querySelector('.muted').textContent = t.hint;
  block.querySelector('.entries-empty').textContent = t.empty;
  block.querySelector('.add-entry').textContent = t.add;
  block.querySelector('.add-entry').addEventListener('click', () => {
    addEntry(type, type === 'education' && !entryList(type).children.length ? { level: 'ug' } : {}, { focus: true });
    markDirty();
    updateCounts();
  });
  return block;
}

const entryList = (type) => form.querySelector(`[data-entries="${type}"]`);
let entrySeq = 0;

function addEntry(type, data = {}, { focus = false, parsed = false } = {}) {
  const t = ENTRY_TYPES[type];
  const n = ++entrySeq;
  const card = document.createElement('div');
  card.className = 'entry' + (parsed ? ' parsed' : '');
  card.innerHTML = `
    <div class="entry-head">
      <span class="entry-title"></span>
      ${parsed ? '<span class="tag">From resume</span>' : ''}
      <div class="entry-actions">
        <button type="button" class="btn icon move" data-dir="-1" title="Move up" aria-label="Move up">${ICON_UP}</button>
        <button type="button" class="btn icon move" data-dir="1" title="Move down" aria-label="Move down">${ICON_DOWN}</button>
        <button type="button" class="btn icon remove" title="Remove" aria-label="Remove">${ICON_TRASH}</button>
      </div>
    </div>
    <div class="grid"></div>`;
  const grid = card.querySelector('.grid');
  for (const f of t.fields) {
    const id = `${type}-${n}-${f.k}`;
    const wrap = document.createElement('div');
    wrap.className = 'field' + (f.wide ? ' wide' : '');
    let input;
    if (f.type === 'checkbox') {
      wrap.classList.add('field-check');
      wrap.innerHTML = `<label class="check"><input type="checkbox" id="${id}"> </label>`;
      wrap.querySelector('label').append(f.label);
      input = wrap.querySelector('input');
      input.checked = !!data[f.k];
    } else {
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = f.label;
      if (f.type === 'select') {
        input = document.createElement('select');
        for (const l of AA_EDU_LEVELS) input.append(new Option(l.label, l.id));
        input.value = data[f.k] || 'other';
      } else {
        input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
        if (input.tagName === 'INPUT') input.type = 'text';
        input.value = data[f.k] || '';
        if (f.ph) input.placeholder = f.ph;
      }
      input.id = id;
      wrap.append(label, input);
    }
    input.dataset.k = f.k;
    grid.append(wrap);
  }
  const refresh = () => {
    const e = readEntry(card);
    card.querySelector('.entry-title').textContent = t.title(e);
    const end = card.querySelector('[data-k="end"]');
    if (type === 'work' && end) {
      end.disabled = !!e.current;
      if (e.current) end.value = '';
      end.placeholder = e.current ? 'Present' : 'MM/YYYY';
    }
  };
  card.addEventListener('input', refresh);
  card.addEventListener('change', refresh);
  card.querySelector('.remove').addEventListener('click', () => { card.remove(); markDirty(); updateCounts(); });
  card.querySelectorAll('.move').forEach((b) => b.addEventListener('click', () => {
    const sib = b.dataset.dir === '-1' ? card.previousElementSibling : card.nextElementSibling;
    if (!sib) return;
    if (b.dataset.dir === '-1') sib.before(card); else sib.after(card);
    markDirty();
  }));
  entryList(type).append(card);
  refresh();
  if (focus) card.querySelector('input[type=text], select').focus();
  return card;
}

function readEntry(card) {
  const e = {};
  card.querySelectorAll('[data-k]').forEach((el) => { e[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
  return e;
}
const readEntries = (type) =>
  [...entryList(type).children].map(readEntry).filter((e) => Object.entries(e).some(([k, v]) => k !== 'level' && v));

function setEntries(type, list, opts) {
  entryList(type).innerHTML = '';
  (list || []).forEach((e) => addEntry(type, e, opts));
}

// ---- Custom fields (any section) -------------------------------------------------------------
let extraSeq = 0;
function renderExtraBlock(groupId) {
  const block = document.createElement('div');
  block.className = 'extra-block';
  block.innerHTML = `<div class="extras" data-extras="${groupId}"></div><button type="button" class="btn add-extra"></button>`;
  block.querySelector('.add-extra').textContent = groupId === 'links' ? '+ Add link' : '+ Add field';
  block.querySelector('.add-extra').addEventListener('click', () => { addExtra(groupId, {}, true); markDirty(); });
  return block;
}

function addExtra(groupId, data = {}, focus = false) {
  const n = ++extraSeq;
  const row = document.createElement('div');
  row.className = 'extra-row';
  row.innerHTML = `
    <div class="field">
      <label for="xl-${n}">Field name</label>
      <input type="text" id="xl-${n}" class="xl">
    </div>
    <div class="field">
      <label for="xv-${n}">Value</label>
      <input type="text" id="xv-${n}" class="xv">
    </div>
    <button type="button" class="btn icon" title="Remove field" aria-label="Remove field">${ICON_TRASH}</button>`;
  row.querySelector('.xl').placeholder = groupId === 'links' ? 'e.g. LeetCode' : 'e.g. Passport number';
  row.querySelector('.xv').placeholder = groupId === 'links' ? 'https://…' : 'Value';
  row.querySelector('.xl').value = data.label || '';
  row.querySelector('.xv').value = data.value || '';
  row.querySelector('.btn.icon').addEventListener('click', () => { row.remove(); markDirty(); });
  form.querySelector(`[data-extras="${groupId}"]`).append(row);
  if (focus) row.querySelector('.xl').focus();
}

function readExtras() {
  const out = {};
  form.querySelectorAll('[data-extras]').forEach((box) => {
    const rows = [...box.querySelectorAll('.extra-row')]
      .map((r) => ({ label: r.querySelector('.xl').value.trim(), value: r.querySelector('.xv').value.trim() }))
      .filter((x) => x.label || x.value);
    if (rows.length) out[box.dataset.extras] = rows;
  });
  return out;
}

// Filled counts in the sidebar, the chip on each panel, and overall completeness.
// A Work / Education entry list counts as one item, filled when it has at least one entry.
function updateCounts() {
  let filled = 0;
  let total = 0;
  for (const panel of form.querySelectorAll('[data-panel]')) {
    const inputs = [...panel.querySelectorAll('input[name], textarea[name]')];
    const n = inputs.filter((el) => el.value.trim()).length;
    const list = panel.querySelector('[data-entries]');
    const entries = list ? list.children.length : 0;
    filled += n + (list && entries ? 1 : 0);
    total += inputs.length + (list ? 1 : 0);
    if (list) list.parentElement.querySelector('.entries-empty').hidden = entries > 0;
    const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    const chip = panel.querySelector('.chip');
    const nav = navItems.querySelector(`[data-target="${panel.dataset.panel}"] .nav-count`);
    if (!inputs.length) {
      nav.textContent = entries || '';
      chip.textContent = plural(entries, 'entry', 'entries');
      chip.classList.toggle('complete', entries > 0);
    } else {
      nav.textContent = `${n}/${inputs.length}`;
      chip.textContent = `${n} of ${inputs.length} filled` + (list ? ` · ${plural(entries, 'job', 'jobs')}` : '');
      chip.classList.toggle('complete', n === inputs.length && (!list || entries > 0));
    }
  }
  const answers = [...customBox.querySelectorAll('.answer')].filter((r) => r.querySelector('.a').value.trim()).length;
  navItems.querySelector('[data-target="answers"] .nav-count').textContent = answers || '';
  navItems.querySelector('[data-target="resume"] .nav-count').textContent = resume ? '✓' : '';
  const pct = total ? Math.round((filled / total) * 100) : 0;
  document.getElementById('completePct').textContent = pct + '%';
  document.getElementById('completeBar').style.width = pct + '%';
}

// ---- Answers --------------------------------------------------------------------------------
let answerSeq = 0;
function addCustomRow(question = '', answer = '', focus = false) {
  const n = ++answerSeq;
  const row = document.createElement('div');
  row.className = 'answer';
  row.innerHTML = `
    <div class="field">
      <label for="q-${n}">Question keywords</label>
      <input id="q-${n}" type="text" class="q" placeholder="e.g. why do you want, why join">
    </div>
    <button type="button" class="btn icon" title="Remove answer" aria-label="Remove answer">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
    </button>
    <div class="field">
      <label for="a-${n}">Answer</label>
      <textarea id="a-${n}" class="a" placeholder="Your answer"></textarea>
    </div>`;
  row.querySelector('.q').value = question;
  row.querySelector('.a').value = answer;
  row.querySelector('.btn.icon').addEventListener('click', () => { row.remove(); markDirty(); updateCounts(); });
  customBox.append(row);
  if (focus) row.querySelector('.q').focus();
}

// ---- Resume ---------------------------------------------------------------------------------
function showResume() {
  document.getElementById('resumeName').textContent = resume ? resume.name : 'No resume saved';
  const kb = resume ? Math.round((resume.data.length * 3) / 4 / 1024) : 0;
  document.getElementById('resumeMeta').textContent = resume
    ? `${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'} · attached to resume upload fields`
    : 'Upload one here or from Quick start.';
  document.getElementById('resumeClear').hidden = !resume;
  updateCounts();
}

function readResume(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---- Load / save ----------------------------------------------------------------------------
function collect() {
  const fields = {};
  for (const el of form.elements) if (el.name) fields[el.name] = el.value.trim();
  const custom = [...customBox.querySelectorAll('.answer')]
    .map((r) => ({ question: r.querySelector('.q').value.trim(), answer: r.querySelector('.a').value.trim() }))
    .filter((c) => c.question || c.answer);
  return {
    profile: { fields, custom, work: readEntries('work'), education: readEntries('education'), extra: readExtras() },
    settings: { overwrite: document.getElementById('overwrite').checked },
  };
}

function apply({ profile, settings }) {
  const fields = (profile && profile.fields) || {};
  for (const el of form.elements) if (el.name) el.value = fields[el.name] || '';
  // Older saves kept the current job and degree as single fields; turn them into entries.
  let work = (profile && profile.work) || [];
  if (!work.length && (fields.currentCompany || fields.currentTitle)) work = [{ company: fields.currentCompany, title: fields.currentTitle, current: true }];
  let education = (profile && profile.education) || [];
  if (!education.length && (fields.university || fields.degree)) {
    education = [{ level: guessLevel(fields.degree), institution: fields.university, degree: fields.degree, major: fields.major, end: fields.gradYear, grade: fields.gpa }];
  }
  setEntries('work', work);
  setEntries('education', education);
  form.querySelectorAll('[data-extras]').forEach((box) => { box.innerHTML = ''; });
  for (const [groupId, rows] of Object.entries((profile && profile.extra) || {})) {
    if (form.querySelector(`[data-extras="${groupId}"]`)) rows.forEach((x) => addExtra(groupId, x));
  }
  customBox.innerHTML = '';
  const custom = (profile && profile.custom) || [];
  custom.forEach((c) => addCustomRow(c.question, c.answer));
  if (!custom.length) addCustomRow();
  document.getElementById('overwrite').checked = !!(settings && settings.overwrite);
  updateCounts();
}

const saveState = document.getElementById('saveState');
function markDirty(isDirty = true) {
  dirty = isDirty;
  saveState.dataset.state = isDirty ? 'dirty' : 'saved';
  saveState.querySelector('span').textContent = isDirty ? 'Unsaved changes' : 'All changes saved';
}

async function save() {
  try {
    // The AI key is stored apart from `settings` (which is passed into web pages) and left out of exports.
    const ai = { groqKey: getKey(), groqModel: document.getElementById('groqModel').value.trim() };
    await chrome.storage.local.set({ ...collect(), resume, ai });
    markDirty(false);
    flash('Saved');
  } catch (e) {
    flash('Could not save: ' + e.message, true);
  }
}

function flash(msg, error = false) {
  statusEl.textContent = msg;
  statusEl.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(flash.t);
  flash.t = setTimeout(() => { statusEl.className = 'toast' + (error ? ' error' : ''); }, 2200);
}

// ---- Events ---------------------------------------------------------------------------------
document.getElementById('save').addEventListener('click', save);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});
document.addEventListener('input', (e) => {
  if (e.target.type === 'file' || e.target.id === 'parseOverwrite') return;
  markDirty();
  // Once edited by hand, a field or entry is no longer "from resume".
  if (e.target.classList.contains('parsed')) {
    e.target.classList.remove('parsed');
    e.target.parentElement.querySelector('.tag')?.remove();
  }
  const card = e.target.closest('.entry.parsed');
  if (card) {
    card.classList.remove('parsed');
    card.querySelector('.entry-head .tag')?.remove();
  }
  updateCounts();
});
window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
window.addEventListener('hashchange', () => show(location.hash.slice(1)));
document.getElementById('addCustom').addEventListener('click', () => addCustomRow('', '', true));
document.getElementById('shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

document.getElementById('resumeFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  resume = await readResume(file);
  showResume();
  await save();
});
document.getElementById('resumeClear').addEventListener('click', async () => {
  resume = null;
  showResume();
  await save();
});

// ---- Resume parsing (Quick start) -----------------------------------------------------------
const dropZone = document.getElementById('dropZone');
const parseResult = document.getElementById('parseResult');
const parseStatus = document.getElementById('parseStatus');
const parseJump = document.getElementById('parseJump');

function showResult(text, error = false) {
  parseResult.hidden = false;
  parseResult.classList.toggle('error', error);
  parseStatus.textContent = text;
}

// Fill the profile fields from a resume (empty ones only, unless "replace" is ticked).
async function parseResumeFile(file) {
  dropZone.classList.add('busy');
  parseJump.innerHTML = '';
  showResult('Reading resume…');
  try {
    const text = await AA_extractText(file);
    let parsed = AA_parseResume(text);
    let source = 'the built-in parser';
    const key = getKey();
    if (key) {
      showResult('Reading resume with AI…');
      try {
        // AI results win; the built-in parser fills anything the AI left out.
        parsed = { ...parsed, ...(await AA_parseResumeAI(text, key, document.getElementById('groqModel').value.trim())) };
        source = 'AI';
      } catch (err) {
        console.warn('Groq parsing failed, using built-in parser', err);
        source = `the built-in parser (AI failed: ${err.message})`;
      }
    }
    const replace = document.getElementById('parseOverwrite').checked;
    form.querySelectorAll('.parsed').forEach((el) => el.classList.remove('parsed'));
    form.querySelectorAll('.tag').forEach((el) => el.remove());
    const perPanel = new Map();
    let count = 0;
    for (const [key, value] of Object.entries(parsed)) {
      const el = form.elements[key];
      if (!el || (el.value.trim() && !replace) || el.value === value) continue;
      el.value = value;
      el.classList.add('parsed');
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'From resume';
      el.parentElement.querySelector('label').append(tag);
      const panel = el.closest('[data-panel]').dataset.panel;
      perPanel.set(panel, (perPanel.get(panel) || 0) + 1);
      count++;
    }
    // Jobs and education: the AI returns full lists; the built-in parser finds the latest of each.
    const work = parsed.work || ((parsed.currentCompany || parsed.currentTitle) ? [{ company: parsed.currentCompany, title: parsed.currentTitle }] : []);
    const education = parsed.education ||
      (parsed.university || parsed.degree
        ? [{ level: guessLevel(parsed.degree), institution: parsed.university, degree: parsed.degree, major: parsed.major, end: parsed.gradYear, grade: parsed.gpa }]
        : []);
    for (const [type, list] of [['work', work], ['education', education]]) {
      if (!list.length || (readEntries(type).length && !replace)) continue;
      setEntries(type, list, { parsed: true });
      perPanel.set(type, (perPanel.get(type) || 0) + list.length);
      count += list.length;
    }
    // Extra profile links the AI found (LeetCode, Kaggle, …) become custom Links fields.
    const existing = new Set(readExtras().links?.map((x) => x.label.toLowerCase()) || []);
    for (const l of parsed.links || []) {
      if (!l.label || !l.url || existing.has(l.label.toLowerCase())) continue;
      addExtra('links', { label: l.label, value: l.url });
      existing.add(l.label.toLowerCase());
      perPanel.set('links', (perPanel.get('links') || 0) + 1);
      count++;
    }

    resume = await readResume(file);
    showResume();
    markDirty();
    updateCounts();
    if (count) {
      showResult(`Filled ${count} field${count === 1 ? '' : 's'} using ${source}. Review each section, add anything missing, then click Save.`);
      for (const s of sections) {
        if (!perPanel.has(s.id)) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = `${s.label} · ${perPanel.get(s.id)}`;
        b.addEventListener('click', () => show(s.id));
        parseJump.append(b);
      }
    } else {
      showResult(`Couldn't find any new details in this file using ${source}. You can still fill them in by hand.`);
    }
  } catch (err) {
    console.error(err);
    showResult(`Couldn't read this file: ${err.message}`, true);
  } finally {
    dropZone.classList.remove('busy');
  }
}

document.getElementById('parseFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) parseResumeFile(file);
});
['dragenter', 'dragover'].forEach((t) => dropZone.addEventListener(t, (e) => { e.preventDefault(); dropZone.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => dropZone.addEventListener(t, () => dropZone.classList.remove('over')));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) parseResumeFile(file);
});

// Which parser will run, shown under the drop zone.
function updateParserMode() {
  const el = document.getElementById('parserMode');
  if (getKey()) {
    el.innerHTML = 'Parsing with <b>AI</b> · <span class="model"></span>';
    el.querySelector('.model').textContent = modelSelect.value || DEFAULT_MODEL;
  } else {
    el.innerHTML = 'Parsing on this computer · <button type="button">Add a Groq key</button> for better results';
    el.querySelector('button').addEventListener('click', () => { show('settings'); keyInput.focus(); });
  }
}

function guessLevel(degree) {
  const d = String(degree || '');
  if (/master|ph\.?\s?d|doctor|\bm\.?\s?(tech|sc|s|e|a|com|ba|ca|phil)\b|\bmba\b|\bmca\b/i.test(d)) return 'pg';
  if (/diploma/i.test(d)) return 'diploma';
  if (/12th|\bpuc?\b|higher secondary|\bhsc\b|intermediate/i.test(d)) return '12';
  if (/10th|sslc|\bssc\b|matric/i.test(d)) return '10';
  return d ? 'ug' : 'other';
}

// ---- Backup ---------------------------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ ...collect(), resume }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'auto-applier-profile.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.profile) throw new Error('not an Auto Applier export');
    apply(data);
    resume = data.resume || null;
    showResume();
    await save();
    flash('Imported');
  } catch (err) {
    flash('Import failed: ' + err.message, true);
  }
});

// ---- Groq API key ---------------------------------------------------------------------------
const keyInput = document.getElementById('groqKey');

// Clean up pasted keys: spaces, line breaks, invisible characters, quotes, a "Bearer " prefix.
function getKey() {
  const clean = keyInput.value
    .replace(/[\s​-‍⁠﻿]+/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^Bearer/i, '');
  if (clean !== keyInput.value) keyInput.value = clean;
  return clean;
}
const maskKey = (k) => (k.length > 10 ? `${k.slice(0, 4)}…${k.slice(-4)}` : k ? '(too short)' : '(empty)');

document.getElementById('toggleKey').addEventListener('click', (e) => {
  const hidden = keyInput.classList.toggle('masked');
  e.target.textContent = hidden ? 'Show' : 'Hide';
});

// ---- Groq model picker ----------------------------------------------------------------------
// Tested on resume extraction (valid JSON, field accuracy, speed), best first.
const RECOMMENDED_MODELS = [
  { id: 'openai/gpt-oss-120b', note: 'Best accuracy (default)' },
  { id: 'openai/gpt-oss-20b', note: 'Faster, nearly as accurate' },
  { id: 'qwen/qwen3.8-27b', note: 'Fastest, but may round years of experience' },
];
const DEFAULT_MODEL = RECOMMENDED_MODELS[0].id;
// Speech, text-to-speech and safety-classifier models can't parse a resume.
const NON_CHAT_MODEL = /whisper|orpheus|tts|playai|guard|safeguard|distil/i;
const modelSelect = document.getElementById('groqModel');
const modelNote = document.getElementById('modelNote');

function renderModels(available, selected) {
  const ids = available ? new Set(available) : null;
  modelSelect.innerHTML = '';
  const rec = document.createElement('optgroup');
  rec.label = 'Recommended for resume parsing';
  for (const m of RECOMMENDED_MODELS) {
    if (ids && !ids.has(m.id)) continue;
    rec.append(new Option(`${m.id} · ${m.note}`, m.id));
  }
  if (rec.children.length) modelSelect.append(rec);
  const others = (available || []).filter((id) => !RECOMMENDED_MODELS.some((m) => m.id === id)).sort();
  if (selected && !RECOMMENDED_MODELS.some((m) => m.id === selected) && !others.includes(selected)) others.unshift(selected);
  if (others.length) {
    const grp = document.createElement('optgroup');
    grp.label = 'Other models';
    for (const id of others) grp.append(new Option(id, id));
    modelSelect.append(grp);
  }
  modelSelect.value = selected || DEFAULT_MODEL;
  if (!modelSelect.value && modelSelect.options.length) modelSelect.selectedIndex = 0;
  updateModelNote();
}

function updateModelNote(extra = '') {
  const rec = RECOMMENDED_MODELS.find((m) => m.id === modelSelect.value);
  modelNote.textContent = extra || (rec ? `Recommended: ${rec.note.toLowerCase()}.` : 'Not tested for resume parsing; results may vary.');
  updateParserMode();
}

// Fetch the models this key can use, so the list stays current as Groq adds or retires models.
async function loadModels() {
  const key = getKey();
  const selected = modelSelect.value || DEFAULT_MODEL;
  if (!key) { renderModels(null, selected); return; }
  if (!key.startsWith('gsk_')) {
    renderModels(null, selected);
    updateModelNote(`That doesn't look like a Groq key (they start with "gsk_"). Got: ${maskKey(key)}. Click Show to check it.`);
    return;
  }
  updateModelNote('Loading models…');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error.message || msg; } catch (e) { /* keep status */ }
      throw new Error(`Groq says "${msg}" for key ${maskKey(key)}. Click Show to check it`);
    }
    const { data } = await res.json();
    const chat = data
      .filter((m) => m.active !== false && !NON_CHAT_MODEL.test(m.id) && (m.context_window || 8192) >= 8192)
      .map((m) => m.id);
    renderModels(chat, selected);
  } catch (err) {
    renderModels(null, selected);
    updateModelNote(`Couldn't load models: ${err.message}. Showing recommended models.`);
  }
}

modelSelect.addEventListener('change', () => updateModelNote());
keyInput.addEventListener('change', loadModels);
keyInput.addEventListener('paste', () => setTimeout(loadModels, 0));

// ---- Init -----------------------------------------------------------------------------------
renderFields();
chrome.storage.local.get(['profile', 'settings', 'resume', 'ai']).then((data) => {
  apply(data);
  keyInput.value = (data.ai && data.ai.groqKey) || '';
  renderModels(null, (data.ai && data.ai.groqModel) || DEFAULT_MODEL);
  loadModels();
  resume = data.resume || null;
  showResume();
  // First visit (nothing saved yet) opens Quick start; otherwise the last section viewed.
  const hasProfile = data.profile && Object.values(data.profile.fields || {}).some(Boolean);
  show(location.hash.slice(1) || (hasProfile ? 'personal' : 'quick-start'));
});
