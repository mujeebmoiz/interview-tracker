// ── State ────────────────────────────────────────────────────────────────────
let isLoggedIn = false;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { accessToken } = await chrome.storage.local.get('accessToken');
  isLoggedIn = !!accessToken;
  isLoggedIn ? showAppView() : showLoginView();
});

// ── Login ────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  hide(errorEl);

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const result = await api('POST', '/api/token/', {
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value,
    }, false);

    await chrome.storage.local.set({
      accessToken: result.data.access,
      refreshToken: result.data.refresh,
    });
    isLoggedIn = true;
    showAppView();
  } catch {
    show(errorEl);
    errorEl.textContent = 'Invalid username or password.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ── Register view toggle ─────────────────────────────────────────────────────
document.getElementById('showRegisterBtn').addEventListener('click', () => {
  hide(document.getElementById('loginView'));
  show(document.getElementById('registerView'));
  document.getElementById('regUsername').focus();
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
  hide(document.getElementById('registerView'));
  show(document.getElementById('loginView'));
  document.getElementById('username').focus();
});

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const errorEl = document.getElementById('registerError');
  hide(errorEl);

  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (password !== confirm) {
    show(errorEl);
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    // Register
    await api('POST', '/api/register/', { username, email, password }, false);
    // Auto-login after successful registration
    const tokenResult = await api('POST', '/api/token/', { username, password }, false);
    await chrome.storage.local.set({
      accessToken: tokenResult.data.access,
      refreshToken: tokenResult.data.refresh,
    });
    isLoggedIn = true;
    showAppView();
  } catch (err) {
    show(errorEl);
    try {
      const detail = JSON.parse(err.message);
      errorEl.textContent = Object.values(detail).flat().join(' ');
    } catch (_e) {
      errorEl.textContent = 'Registration failed. Try a different username.';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['accessToken', 'refreshToken']);
  isLoggedIn = false;
  showLoginView();
});

// ── Settings ─────────────────────────────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── View All ─────────────────────────────────────────────────────────────────
document.getElementById('viewAllBtn').addEventListener('click', async () => {
  const { frontendUrl = 'http://localhost:3000' } = await chrome.storage.local.get('frontendUrl');
  chrome.tabs.create({ url: frontendUrl });
});

// ── Re-extract ───────────────────────────────────────────────────────────────
document.getElementById('refreshExtractBtn').addEventListener('click', extractAndFill);

// ── Autofill Page ─────────────────────────────────────────────────────────────
document.getElementById('autofillBtn').addEventListener('click', async () => {
  const { userProfile } = await chrome.storage.local.get('userProfile');
  if (!userProfile?.firstName) {
    alert('Please set your profile in Settings first (gear icon).');
    return;
  }
  const result = await sendMessage({ type: 'AUTOFILL_FORM', payload: userProfile });
  if (result?.filled > 0) {
    showFlash(`Filled ${result.filled} field(s).`, 'success');
  } else if (result?.error) {
    showFlash('Could not autofill: ' + result.error, 'error');
  } else {
    showFlash('No fillable fields found on this page.', 'error');
  }
});

// ── Save Application ─────────────────────────────────────────────────────────
document.getElementById('appForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('saveBtn');
  const errorEl = document.getElementById('submitError');
  const successEl = document.getElementById('submitSuccess');
  hide(errorEl); hide(successEl);

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    company_name: document.getElementById('company').value.trim(),
    job_title: document.getElementById('jobTitle').value.trim(),
    application_date: document.getElementById('appDate').value || today(),
    status: document.getElementById('status').value,
    location: document.getElementById('location').value.trim(),
    salary_range: document.getElementById('salary').value.trim(),
    url: document.getElementById('url').value.trim(),
    notes: document.getElementById('notes').value.trim(),
  };

  try {
    await api('POST', '/api/applications/', payload);
    show(successEl);
    setTimeout(() => hide(successEl), 3000);
    // Optionally clear only the notes field, keeping context
    document.getElementById('notes').value = '';
  } catch (err) {
    show(errorEl);
    try {
      const detail = JSON.parse(err.message);
      errorEl.textContent = Object.values(detail).flat().join(' ');
    } catch (_e) {
      errorEl.textContent = 'Failed to save. Check your connection.';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Application';
  }
});

// ── View helpers ─────────────────────────────────────────────────────────────
function showLoginView() {
  show(document.getElementById('loginView'));
  hide(document.getElementById('registerView'));
  hide(document.getElementById('appView'));
  hide(document.getElementById('appFooter'));
  document.getElementById('username').focus();
}

async function showAppView() {
  hide(document.getElementById('loginView'));
  hide(document.getElementById('registerView'));
  show(document.getElementById('appView'));
  show(document.getElementById('appFooter'));

  document.getElementById('appDate').value = today();

  // If the floating bar triggered this open, use its pre-detected data
  const { pendingJob } = await chrome.storage.local.get('pendingJob');
  if (pendingJob) {
    await chrome.storage.local.remove('pendingJob');
    document.getElementById('jobTitle').value = pendingJob.job_title || '';
    document.getElementById('company').value = pendingJob.company_name || '';
    document.getElementById('location').value = pendingJob.location || '';
    document.getElementById('salary').value = pendingJob.salary || '';
    document.getElementById('url').value = pendingJob.url || '';
    const banner = document.getElementById('detectedBanner');
    document.getElementById('detectedText').textContent =
      `Detected: ${pendingJob.job_title || 'job'} at ${pendingJob.company_name || 'unknown'}`;
    banner.className = 'banner banner-success';
    document.getElementById('refreshExtractBtn').textContent = 'Re-extract';
  } else {
    await extractAndFill();
  }
}

async function extractAndFill() {
  const detectedText = document.getElementById('detectedText');
  const extractBtn = document.getElementById('refreshExtractBtn');

  detectedText.textContent = 'Scanning…';
  extractBtn.disabled = true;

  const result = await sendMessage({ type: 'GET_JOB_DATA' });

  extractBtn.disabled = false;
  extractBtn.textContent = 'Re-extract';

  if (result && !result.error && (result.jobTitle || result.company)) {
    document.getElementById('jobTitle').value = result.jobTitle || '';
    document.getElementById('company').value = result.company || '';
    document.getElementById('location').value = result.location || '';
    document.getElementById('salary').value = result.salary || '';
    document.getElementById('url').value = result.url || '';

    detectedText.textContent = `Detected: ${result.jobTitle || 'job'} at ${result.company || 'unknown'}`;
    document.getElementById('detectedBanner').className = 'banner banner-success';
  } else {
    detectedText.textContent = 'No job detected on this page';
    document.getElementById('detectedBanner').className = 'banner banner-neutral';
    extractBtn.textContent = 'Extract';
  }
}

// ── API helper ────────────────────────────────────────────────────────────────
async function api(method, endpoint, data, withAuth = true) {
  if (withAuth) {
    const { accessToken } = await chrome.storage.local.get('accessToken');
    return sendMessage({ type: 'API_REQUEST', payload: { method, endpoint, data, token: accessToken } });
  }
  return sendMessage({ type: 'API_REQUEST', payload: { method, endpoint, data } });
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(response);
    });
  });
}

// ── Utilities ────────────────────────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function today() { return new Date().toISOString().split('T')[0]; }

function showFlash(msg, type) {
  const el = type === 'success'
    ? document.getElementById('submitSuccess')
    : document.getElementById('submitError');
  el.textContent = msg;
  show(el);
  setTimeout(() => hide(el), 3000);
}
