// Fill report: a floating panel that counts how many form questions are answered,
// so you can see what Auto Applier filled and what it missed. Fields with data-aa-ignore are skipped.
(function () {
  const SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), select, textarea';
  const txt = (n) => (n ? (n.innerText || n.textContent || '').trim() : '');

  function labelFor(el) {
    if (el.type === 'radio') {
      const box = el.closest('fieldset, [role=radiogroup], .question');
      const legend = box && box.querySelector('legend, .q-label, label:not(:has(input))');
      return txt(legend) || el.name;
    }
    const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    return (txt(byFor) || txt(el.closest('label')) || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || '(unlabelled)')
      .replace(/\s*\*\s*$/, '').split('\n')[0];
  }

  // One entry per question: radios grouped by name, everything else one by one.
  function questions() {
    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (el.closest('#aa-report') || el.closest('[data-aa-ignore]') || el.type === 'checkbox') continue;
      if (el.type === 'radio') {
        if (seen.has(el.name)) continue;
        seen.add(el.name);
        const all = [...document.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)];
        out.push({ label: labelFor(el), els: all, filled: all.some((r) => r.checked), focus: el.closest('fieldset, .question') || el });
        continue;
      }
      const filled = el.type === 'file' ? el.files.length > 0 : el.value.trim() !== '';
      out.push({ label: labelFor(el), els: [el], filled, focus: el.type === 'file' ? el.closest('.field, .question') || el : el });
    }
    return out;
  }

  const panel = document.createElement('aside');
  panel.id = 'aa-report';
  panel.innerHTML = `
    <style>
      #aa-report { position: fixed; left: 16px; bottom: 16px; z-index: 99999; width: 280px; max-height: 60vh; display: flex; flex-direction: column;
        font: 13px/1.45 "Segoe UI", system-ui, sans-serif; color: #1b1d22; background: #fff; border: 1px solid #d9dce3; border-radius: 10px;
        box-shadow: 0 8px 28px rgba(20, 24, 40, .16); overflow: hidden; }
      #aa-report header { padding: 12px 14px 10px; border-bottom: 1px solid #eceef2; display: grid; gap: 6px; }
      #aa-report .top { display: flex; justify-content: space-between; align-items: baseline; }
      #aa-report b { font-size: 14px; }
      #aa-report .num { font-variant-numeric: tabular-nums; color: #4a4f59; }
      #aa-report .bar { height: 6px; background: #eceef2; border-radius: 3px; overflow: hidden; }
      #aa-report .bar span { display: block; height: 100%; background: #2fa36b; width: 0; transition: width .3s; }
      #aa-report .tools { display: flex; gap: 6px; }
      #aa-report button { font: inherit; font-size: 12px; padding: 4px 9px; border: 1px solid #d6d9e0; background: #fff; border-radius: 5px; cursor: pointer; color: #1b1d22; }
      #aa-report button:hover { background: #f0f2f5; }
      #aa-report ul { list-style: none; margin: 0; padding: 6px 0; overflow-y: auto; }
      #aa-report li { padding: 3px 14px; display: flex; gap: 8px; cursor: pointer; }
      #aa-report li:hover { background: #f6f7f9; }
      #aa-report li i { font-style: normal; width: 14px; flex: none; text-align: center; }
      #aa-report li.ok i { color: #2fa36b; }
      #aa-report li.miss i { color: #c0392b; }
      #aa-report li.miss span { color: #6b717d; }
      #aa-report.min ul, #aa-report.min .tools { display: none; }
      .aa-missing { outline: 2px dashed #e0533f !important; outline-offset: 2px; }
    </style>
    <header>
      <div class="top"><b>Fill report</b><span class="num"></span></div>
      <div class="bar"><span></span></div>
      <div class="tools">
        <button type="button" data-act="mark">Outline empty</button>
        <button type="button" data-act="reset">Clear form</button>
        <button type="button" data-act="min">Hide list</button>
      </div>
    </header>
    <ul></ul>`;
  document.body.append(panel);

  let marking = false;
  let lastSig = '';
  function render() {
    const qs = questions();
    const done = qs.filter((q) => q.filled).length;
    const sig = qs.map((q) => +q.filled).join('');
    if (sig === lastSig) return;
    lastSig = sig;
    panel.querySelector('.num').textContent = `${done} / ${qs.length} filled`;
    panel.querySelector('.bar span').style.width = qs.length ? (done / qs.length) * 100 + '%' : '0';
    const ul = panel.querySelector('ul');
    ul.innerHTML = '';
    // Missed questions first, so they're easy to spot.
    for (const q of [...qs.filter((q) => !q.filled), ...qs.filter((q) => q.filled)]) {
      const li = document.createElement('li');
      li.className = q.filled ? 'ok' : 'miss';
      li.innerHTML = `<i>${q.filled ? '✓' : '✗'}</i><span></span>`;
      li.querySelector('span').textContent = q.label;
      li.addEventListener('click', () => { q.focus.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (q.els[0].focus) q.els[0].focus({ preventScroll: true }); });
      ul.append(li);
    }
    document.querySelectorAll('.aa-missing').forEach((n) => n.classList.remove('aa-missing'));
    if (marking) qs.filter((q) => !q.filled).forEach((q) => q.focus.classList.add('aa-missing'));
  }

  panel.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'mark') { marking = !marking; e.target.textContent = marking ? 'Stop outlining' : 'Outline empty'; lastSig = ''; }
    if (act === 'min') { panel.classList.toggle('min'); e.target.textContent = panel.classList.contains('min') ? 'Show list' : 'Hide list'; }
    if (act === 'reset') {
      document.querySelectorAll('form').forEach((f) => f.reset());
      document.dispatchEvent(new CustomEvent('aa-test-reset'));
      lastSig = '';
    }
    render();
  });
  document.addEventListener('input', render, true);
  document.addEventListener('change', render, true);
  setInterval(render, 800);
  render();
})();
