const DEFAULT_API_URL = 'http://localhost:8000';

const JOB_SITE_PATTERNS = [
  /linkedin\.com\/jobs/,
  /indeed\.com/,
  /glassdoor\.com\/(job|Jobs)/,
  /greenhouse\.io/,
  /lever\.co/,
  /myworkdayjobs\.com/,
  /workday\.com.*\/job\//,
  /ashbyhq\.com/,
  /wellfound\.com\/jobs/,
  /ziprecruiter\.com\/jobs/,
];

// ── Message Router ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_REQUEST') {
    handleApiRequest(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'GET_JOB_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return sendResponse({ error: 'No active tab' });
      try {
        // Inject content.js so extractJobData() exists in the isolated world.
        // The guard in content.js makes this a no-op if already injected.
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js'],
        });
        // Call extractJobData() directly — no message round-trip needed.
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => extractJobData(),
        });
        sendResponse(results?.[0]?.result || { error: 'No data extracted' });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true;
  }

  if (message.type === 'OPEN_POPUP_WITH_JOB') {
    chrome.storage.local.set({ pendingJob: message.payload }).then(async () => {
      try {
        await chrome.action.openPopup();
      } catch (_) {
        // chrome.action.openPopup() requires Chrome 127+ and a user gesture;
        // the floating bar button already shows "Click icon ↗" as fallback.
      }
      sendResponse({});
    });
    return true;
  }

  if (message.type === 'QUICK_SAVE') {
    chrome.storage.local.get('accessToken').then(({ accessToken }) => {
      if (!accessToken) return sendResponse({ error: 'NOT_LOGGED_IN' });
      handleApiRequest({ method: 'POST', endpoint: '/api/applications/', data: message.payload })
        .then(() => sendResponse({}))
        .catch(err => sendResponse({ error: err.message }));
    });
    return true;
  }

  if (message.type === 'AUTOFILL_FORM') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return sendResponse({ error: 'No active tab' });
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: performAutofill,
        args: [message.payload],
      }).then(results => sendResponse({ filled: results?.[0]?.result ?? 0 }))
        .catch(err => sendResponse({ error: err.message }));
    });
    return true;
  }
});

// ── Badge on job sites ───────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (JOB_SITE_PATTERNS.some(p => p.test(tab.url))) {
    chrome.action.setBadgeText({ text: '↓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// ── API Proxy ────────────────────────────────────────────────────────────────
async function handleApiRequest({ method, endpoint, data }) {
  const { apiUrl = DEFAULT_API_URL, accessToken } = await chrome.storage.local.get(['apiUrl', 'accessToken']);
  const url = `${apiUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401 && endpoint !== '/api/token/') {
    const newToken = await refreshAccessToken(apiUrl);
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { method, headers, body: data ? JSON.stringify(data) : undefined });
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(json));
  return { data: json };
}

async function refreshAccessToken(apiUrl) {
  const { refreshToken } = await chrome.storage.local.get('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch(`${apiUrl}/api/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    await chrome.storage.local.remove(['accessToken', 'refreshToken']);
    return null;
  }
  const { access } = await res.json();
  await chrome.storage.local.set({ accessToken: access });
  return access;
}

// ── Autofill (injected into page) ────────────────────────────────────────────
// This function runs in the page context (passed to executeScript)
function performAutofill(profile) {
  const fieldMap = [
    { keys: ['first_name', 'firstname', 'fname'], placeholder: /first.?name/i, value: profile.firstName },
    { keys: ['last_name', 'lastname', 'lname'], placeholder: /last.?name/i, value: profile.lastName },
    { keys: ['email', 'email_address'], placeholder: /e.?mail/i, value: profile.email },
    { keys: ['phone', 'phone_number', 'mobile'], placeholder: /phone|mobile/i, value: profile.phone },
    { keys: ['linkedin', 'linkedin_url'], placeholder: /linkedin/i, value: profile.linkedin },
    { keys: ['github', 'github_url'], placeholder: /github/i, value: profile.github },
    { keys: ['website', 'portfolio', 'personal_website'], placeholder: /website|portfolio/i, value: profile.website },
    { keys: ['city', 'location'], placeholder: /city|location/i, value: profile.city },
  ];

  let filled = 0;
  fieldMap.forEach(({ keys, placeholder, value }) => {
    if (!value) return;
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type])');
    for (const input of inputs) {
      if (input.value) continue;
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const ph = (input.placeholder || '');
      const matchesKey = keys.some(k => name.includes(k) || id.includes(k));
      const matchesPh = placeholder.test(ph);
      if (matchesKey || matchesPh) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        break;
      }
    }
  });
  return filled;
}
