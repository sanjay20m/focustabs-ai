// popup.js - Minimal, modern tab list for a popup (Manifest V3 compatible).
// Make sure "tabs" permission exists in manifest.json for querying tab URLs & favicons.

const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const focusBtn = document.getElementById('focusBtn');
const closeAllBtn = document.getElementById('closeAllBtn');
const optionsBtn = document.getElementById('optionsBtn');

let tabs = [];
let selectedIds = new Set();

async function init() {
  try {
    // Query tabs in the current window
    tabs = await chrome.tabs.query({ currentWindow: true });
    renderList(tabs);
  } catch (err) {
    listEl.innerHTML = `<div class="empty">Unable to access tabs. Make sure the extension has the 'tabs' permission.</div>`;
    console.error(err);
  }
}

function renderList(items) {
  if (!items || items.length === 0) {
    listEl.innerHTML = `<div class="empty">No tabs found.</div>`;
    return;
  }
  const q = searchEl.value.trim().toLowerCase();
  const filtered = items.filter(t => {
    const s = (t.title || '') + ' ' + (t.url || '');
    return s.toLowerCase().includes(q);
  });

  listEl.innerHTML = '';
  for (const tab of filtered) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;

    // Favicon
    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    favicon.alt = '';
    favicon.width = 40;
    favicon.height = 40;
    favicon.src = tab.favIconUrl || chrome.runtime.getURL('icons/placeholder-40.png');
    favicon.onerror = () => { favicon.src = chrome.runtime.getURL('icons/placeholder-40.png'); };

    // Info
    const info = document.createElement('div');
    info.className = 'info';
    const ttitle = document.createElement('div');
    ttitle.className = 'title-text';
    ttitle.textContent = tab.title || '(no title)';
    const turl = document.createElement('div');
    turl.className = 'url-text';
    turl.textContent = new URL(tab.url || 'about:blank').hostname || tab.url || '';
    info.appendChild(ttitle);
    info.appendChild(turl);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    const activateBtn = document.createElement('button');
    activateBtn.className = 'icon-btn';
    activateBtn.title = 'Activate tab';
    activateBtn.textContent = 'Open';
    activateBtn.onclick = () => activateTab(tab.id);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'icon-btn';
    closeBtn.title = 'Close tab';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => closeTab(tab.id);

    const pinBtn = document.createElement('button');
    pinBtn.className = 'icon-btn';
    pinBtn.title = 'Toggle pin';
    pinBtn.textContent = tab.pinned ? 'Unpin' : 'Pin';
    pinBtn.onclick = async () => {
      await chrome.tabs.update(tab.id, { pinned: !tab.pinned });
      await refresh();
    };

    // Select toggle (for bulk actions)
    const selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.title = 'Select for bulk action';
    selectCheckbox.onchange = (e) => {
      if (e.target.checked) selectedIds.add(tab.id);
      else selectedIds.delete(tab.id);
      updateBulkUI();
    };

    actions.appendChild(selectCheckbox);
    actions.appendChild(activateBtn);
    actions.appendChild(pinBtn);
    actions.appendChild(closeBtn);

    card.appendChild(favicon);
    card.appendChild(info);
    card.appendChild(actions);

    // Keyboard-friendly activation
    card.onkeydown = (e) => {
      if (e.key === 'Enter') activateTab(tab.id);
      if (e.key === 'Delete') closeTab(tab.id);
    };

    listEl.appendChild(card);
  }

  updateBulkUI();
}

function updateBulkUI() {
  const any = selectedIds.size > 0;
  focusBtn.disabled = !any;
  closeAllBtn.disabled = !any;
  if (any) {
    focusBtn.classList.add('primary');
  } else {
    focusBtn.classList.remove('primary');
  }
}

// Actions
async function activateTab(tabId) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update((await chrome.tabs.get(tabId)).windowId, { focused: true });
  // optional: close popup so user sees tab
  window.close();
}

async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
    selectedIds.delete(tabId);
    await refresh();
  } catch (err) {
    console.error('Failed to close tab', err);
  }
}

focusBtn.addEventListener('click', async () => {
  // Focus tabs: activate the first selected tab and optionally close others
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  await activateTab(ids[0]);
});

closeAllBtn.addEventListener('click', async () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  try {
    await chrome.tabs.remove(ids);
    selectedIds.clear();
    await refresh();
  } catch (err) {
    console.error(err);
  }
});

optionsBtn.addEventListener('click', () => {
  // If your extension has an options page, open it. Adjust as needed.
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else window.open('options.html');
});

// Search
let searchTimer = null;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderList(tabs), 180);
});

async function refresh() {
  tabs = await chrome.tabs.query({ currentWindow: true });
  renderList(tabs);
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById("askAIButton").addEventListener("click", async () => {
  const input = document.getElementById("promptInput");
  const output = document.getElementById("output");
  
  if (!input.value.trim()) {
    output.textContent = "Please enter something to ask.";
    return;
  }

  output.textContent = "Thinking... 🤔";
  const reply = await getAIResponse(input.value);
  output.textContent = reply;
});
document.addEventListener("DOMContentLoaded", async () => {
  // Fetch current tabs
  const tabs = await chrome.tabs.query({});
  const total = tabs.length;

  // Identify most used domains
  const domains = {};
  tabs.forEach(t => {
    try {
      const u = new URL(t.url);
      domains[u.hostname] = (domains[u.hostname] || 0) + 1;
    } catch {}
  });
  const topDomains = Object.entries(domains)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([d,c])=>`${d} (${c})`)
    .join(", ");

  // Track active tab time
  const startTime = Date.now();
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const focusScore = Math.max(20, 100 - total * 4);
    document.getElementById("focusStats").innerHTML = `
      <b>Total Tabs:</b> ${total}<br>
      <b>Top Domains:</b> ${topDomains}<br>
      <b>Active Time:</b> ${mins}m ${secs}s<br>
      <b>Focus Score:</b> ${focusScore}/100
    `;
  }, 1000);

  // Generate AI suggestion
  generateAutoSuggestion(total, topDomains);
});

async function generateAutoSuggestion(total, topDomains) {
  const prompt = `You are a digital wellbeing assistant. Based on this context:
  The user has ${total} open tabs. Top domains: ${topDomains}.
  Give one short friendly suggestion (max 2 sentences) to help them focus or improve productivity.`;

  document.getElementById("autoSuggestion").textContent = "Thinking with Gemini… 🤖";

  const suggestion = await getAIResponse(prompt);
  document.getElementById("autoSuggestion").textContent = suggestion;
}
