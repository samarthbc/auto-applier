// Clicking the toolbar icon (or Alt+Shift+F) fills the form on the current tab.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener(async (tab) => {
  const { profile, settings, resume } = await chrome.storage.local.get(['profile', 'settings', 'resume']);
  const hasData = profile && (Object.values(profile.fields || {}).some((v) => String(v).trim()) || (profile.custom || []).length);
  if (!hasData) {
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    const target = { tabId: tab.id, allFrames: true };
    await chrome.scripting.executeScript({ target, files: ['fields.js', 'filler.js'] });
    const results = await chrome.scripting.executeScript({
      target,
      func: (p, s, r) => (globalThis.AA_fill ? globalThis.AA_fill(p, s, r) : { filled: 0 }),
      args: [profile, settings || {}, resume || null],
    });
    const total = results.reduce((sum, r) => sum + ((r.result && r.result.filled) || 0), 0);
    await setBadge(tab.id, String(total), total ? '#16a34a' : '#6b7280');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: showToast, args: [total] });
  } catch (e) {
    // e.g. chrome:// pages, the Web Store, or PDF viewers can't be scripted
    console.warn('Auto Applier: could not fill this page', e);
    await setBadge(tab.id, '!', '#dc2626');
  }
});

async function setBadge(tabId, text, color) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  await chrome.action.setBadgeText({ tabId, text });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {}), 4000);
}

// Runs in the page's top frame.
function showToast(count) {
  const id = 'auto-applier-toast';
  document.getElementById(id)?.remove();
  const el = document.createElement('div');
  el.id = id;
  el.textContent = count
    ? `Auto Applier filled ${count} field${count === 1 ? '' : 's'} — review before submitting.`
    : 'Auto Applier found no empty fields it recognised.';
  Object.assign(el.style, {
    position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
    background: count ? '#166534' : '#374151', color: '#fff', padding: '10px 14px',
    borderRadius: '8px', font: '14px/1.4 system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,.25)',
  });
  document.documentElement.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
