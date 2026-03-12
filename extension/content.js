// Guard against being injected twice (content_scripts match + on-demand executeScript)
if (!window.__itContentLoaded) {
  window.__itContentLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_JOB_DATA') {
      sendResponse(extractJobData());
    }
  });

  // Initial bar after page settles
  setTimeout(showFloatingBar, 1200);

  // Re-trigger on SPA navigation (LinkedIn/Indeed update <title> when you
  // click a different job in the list without doing a full page load)
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      clearTimeout(window.__itNavTimer);
      window.__itNavTimer = setTimeout(() => {
        const bar = document.getElementById('__it-bar');
        if (bar) bar.remove();
        showFloatingBar();
      }, 900);
    }).observe(titleEl, { childList: true });
  }

} // end guard

// ── Floating bar ─────────────────────────────────────────────────────────────
function showFloatingBar() {
  if (document.getElementById('__it-bar')) return;

  const data = extractJobData();
  if (!data.jobTitle && !data.company) return; // not a job page

  const bar = document.createElement('div');
  bar.id = '__it-bar';
  bar.innerHTML = `
    <div id="__it-inner">
      <div id="__it-info">
        <span id="__it-title">${esc(data.jobTitle || 'Job detected')}</span>
        <span id="__it-company">${esc(data.company)}</span>
      </div>
      <div id="__it-actions">
        <button id="__it-save">Save</button>
        <button id="__it-dismiss" aria-label="Dismiss">✕</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #__it-bar {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }
    #__it-inner {
      display: flex; align-items: center; gap: 12px;
      background: #1e293b; color: #f1f5f9;
      padding: 10px 14px; border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
      max-width: 340px;
    }
    #__it-info { flex: 1; min-width: 0; }
    #__it-title {
      display: block; font-weight: 600; font-size: 13px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #__it-company { display: block; font-size: 11px; color: #94a3b8; margin-top: 1px; }
    #__it-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    #__it-save {
      background: #3b82f6; color: #fff; border: none; border-radius: 6px;
      padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    #__it-save:hover { background: #2563eb; }
    #__it-save:disabled { background: #475569; cursor: not-allowed; }
    #__it-dismiss {
      background: none; border: none; color: #64748b;
      font-size: 14px; cursor: pointer; padding: 2px 4px; line-height: 1;
    }
    #__it-dismiss:hover { color: #f1f5f9; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(bar);

  document.getElementById('__it-dismiss').addEventListener('click', () => bar.remove());

  document.getElementById('__it-save').addEventListener('click', async () => {
    const btn = document.getElementById('__it-save');
    btn.textContent = 'Opening…';
    btn.disabled = true;

    await chrome.runtime.sendMessage({
      type: 'OPEN_POPUP_WITH_JOB',
      payload: {
        job_title: data.jobTitle,
        company_name: data.company,
        location: data.location,
        salary: data.salary,
        url: data.url,
      },
    });

    // openPopup() may not be supported on all Chrome versions —
    // fall back to nudging the user to click the icon
    btn.textContent = 'Click icon ↗';
    btn.disabled = false;
  });
}

function esc(str) {
  return (str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Main extractor ───────────────────────────────────────────────────────────
function extractJobData() {
  const hostname = window.location.hostname;

  // Try structured data first (works on many modern sites)
  const fromSchema = extractFromJsonLd();
  if (fromSchema?.jobTitle) return withSalaryFallback(fromSchema);

  let result;
  if (hostname.includes('linkedin.com')) result = extractLinkedIn();
  else if (hostname.includes('indeed.com')) result = extractIndeed();
  else if (hostname.includes('glassdoor.com')) result = extractGlassdoor();
  else if (hostname.includes('greenhouse.io')) result = extractGreenhouse();
  else if (hostname.includes('lever.co')) result = extractLever();
  else if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) result = extractWorkday();
  else if (hostname.includes('ashbyhq.com')) result = extractAshby();
  else result = extractGeneric();

  return withSalaryFallback(result);
}

// Validate + fallback for salary.
// CSS selectors sometimes match a benefits *container* — discard anything that
// is too long or doesn't actually contain a salary-like pattern.
function withSalaryFallback(data) {
  const salarySanity = /[$£€\d][\d,kK.\s\-–—~]+(?:\/|\s+per\s+|\s*[-–—~]\s*[$£€\d]|[kK])\s*(?:yr|year|hr|hour|month|annum|[kK]|\d)/i;
  if (data.salary && (data.salary.length > 60 || !salarySanity.test(data.salary))) {
    data.salary = '';
  }
  if (!data.salary) data.salary = extractSalaryFromPageText();
  return data;
}

// ── JSON-LD / Schema.org ─────────────────────────────────────────────────────
function extractFromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const job = Array.isArray(data) ? data.find(d => d['@type'] === 'JobPosting') : data;
      if (job?.['@type'] === 'JobPosting') {
        return {
          jobTitle: job.title || '',
          company: job.hiringOrganization?.name || '',
          location: formatLocation(job.jobLocation),
          salary: job.baseSalary ? formatSalary(job.baseSalary) : '',
          url: window.location.href,
        };
      }
    } catch (_) {}
  }
  return null;
}

function formatLocation(loc) {
  if (!loc) return '';
  const addr = Array.isArray(loc) ? loc[0]?.address : loc?.address;
  if (!addr) return '';
  const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
  return parts.join(', ');
}

function formatSalary(salary) {
  if (!salary) return '';
  const { value } = salary;
  if (!value) return '';
  if (value.minValue && value.maxValue) return `$${value.minValue} - $${value.maxValue}`;
  if (value.value) return `$${value.value}`;
  return '';
}

// ── LinkedIn ─────────────────────────────────────────────────────────────────
function extractLinkedIn() {
  return {
    jobTitle: text([
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1[class*="job-title"]',
      '.jobs-unified-top-card__job-title',
    ]),
    company: text([
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
    ]),
    location: text([
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
    ]),
    salary: text([
      '.compensation-module__salary-range',
      '[class*="salary"]',
    ]),
    url: window.location.href,
  };
}

// ── Indeed ───────────────────────────────────────────────────────────────────
function extractIndeed() {
  return {
    jobTitle: text([
      'h1.jobsearch-JobInfoHeader-title',
      'h1[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1[class*="JobTitle"]',
    ]),
    company: text([
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.jobsearch-InlineCompanyRating-companyName',
    ]),
    location: text([
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
      '.jobsearch-JobInfoHeader-subtitle span:last-child',
    ]),
    salary: text([
      '[data-testid="attribute_snippet_testid"]',
      '[class*="salary"]',
    ]),
    url: window.location.href,
  };
}

// ── Glassdoor ────────────────────────────────────────────────────────────────
function extractGlassdoor() {
  return {
    jobTitle: text([
      '[data-test="job-title"]',
      'h1[class*="JobTitle"]',
      '.JobDetails_jobTitle__Rw_gn',
    ]),
    company: text([
      '[data-test="employer-name"]',
      '[class*="EmployerProfile"]  [class*="name"]',
    ]),
    location: text([
      '[data-test="location"]',
      '[class*="location"]',
    ]),
    salary: text([
      '[data-test="detailSalary"]',
      '[class*="salary" i]',
    ]),
    url: window.location.href,
  };
}

// ── Greenhouse ───────────────────────────────────────────────────────────────
function extractGreenhouse() {
  return {
    jobTitle: text(['h1.app-title', 'h1[class*="title"]', 'h1']),
    company: text(['.company-name', '#header .company-name', 'title']) ||
      document.title.split(' at ').pop()?.trim() || '',
    location: text(['.location', '[class*="location"]']),
    salary: '',
    url: window.location.href,
  };
}

// ── Lever ────────────────────────────────────────────────────────────────────
function extractLever() {
  return {
    jobTitle: text(['.posting-headline h2', 'h2[data-qa="posting-name"]']),
    company: text(['.main-header-logo img']) ||
      window.location.hostname.split('.')[0] || '',
    location: text(['.posting-categories .location', '[data-qa="posting-location"]']),
    salary: text(['.posting-categories .commitment']),
    url: window.location.href,
  };
}

// ── Workday ──────────────────────────────────────────────────────────────────
function extractWorkday() {
  return {
    jobTitle: text([
      '[data-automation-id="jobPostingHeader"]',
      'h2[class*="jobTitle"]',
      '.css-uyuzap',
    ]),
    company: text([
      '[data-automation-id="company"]',
      '.css-8z7d3f',
    ]) || window.location.hostname.split('.')[0],
    location: text([
      '[data-automation-id="locations"]',
      '[data-automation-id="location"]',
    ]),
    salary: text(['[data-automation-id="salary"]', '[class*="salary" i]']),
    url: window.location.href,
  };
}

// ── Ashby ────────────────────────────────────────────────────────────────────
function extractAshby() {
  return {
    jobTitle: text(['h1[class*="title"]', 'h1']),
    company: text(['[class*="company"]']) || window.location.hostname.split('.')[0],
    location: text(['[class*="location"]']),
    salary: text(['[class*="salary" i]', '[class*="compensation" i]']),
    url: window.location.href,
  };
}

// ── Generic fallback ─────────────────────────────────────────────────────────
function extractGeneric() {
  const title = document.title || '';
  // Heuristic: "Job Title at Company | Site" or "Job Title - Company"
  let jobTitle = '';
  let company = '';

  const atMatch = title.match(/^(.+?)\s+at\s+(.+?)[\s|–-]/);
  if (atMatch) {
    jobTitle = atMatch[1].trim();
    company = atMatch[2].trim();
  } else {
    jobTitle = text(['h1']) || '';
  }

  return {
    jobTitle,
    company,
    location: text(['[class*="location" i]', '[id*="location" i]']),
    salary: text(['[class*="salary" i]', '[class*="compensation" i]']),
    url: window.location.href,
  };
}

// ── Salary from page text (regex fallback) ───────────────────────────────────
// Reads salary-specific elements first, then the full page description.
function extractSalaryFromPageText() {
  // Ordered most→least specific.
  // Handles: $80k-$120k, $80,000–$120,000/yr, $45/hr, 80K-100K, USD 80,000,
  //          £70,000, €60k, 80000 per year, $80 - $90 per hour, etc.
  const PATTERNS = [
    // ── Range with period qualifier ────────────────────────────────────────
    // $80,000 - $120,000 / yr|year|hr|hour|month   (currency on both sides optional)
    /[$£€]?\s*[\d,]+(?:\.\d+)?[kK]?\s*[-–—~]\s*[$£€]?\s*[\d,]+(?:\.\d+)?[kK]?\s*(?:\/\s*(?:yr|year|hour|hr|month|mo|annum)|(?:\s+per\s+(?:year|hour|hr|month|annum)))/i,
    // ── Single value with period qualifier ────────────────────────────────
    // $45/hr  |  $80k per year  |  £70,000/annum
    /[$£€]\s*[\d,]+(?:\.\d+)?[kK]?\s*(?:\/\s*(?:yr|year|hour|hr|month|mo|annum)|(?:\s+per\s+(?:year|hour|hr|month|annum)))/i,
    // ── Bare range with currency on at least one side ──────────────────────
    // $80k - $120k  |  $80,000–$120,000  |  £60k to £80k
    /[$£€]\s*[\d,]+(?:\.\d+)?[kK]?\s*[-–—~to]+\s*[$£€]?\s*[\d,]+(?:\.\d+)?[kK]?/i,
    // ── ISO currency prefix: USD 80,000 - 120,000 ─────────────────────────
    /(?:USD|CAD|GBP|EUR|AUD|INR)\s*[\d,]+(?:\.\d+)?[kK]?\s*[-–—~to]*\s*[\d,]*(?:\.\d+)?[kK]?/i,
    // ── Plain number range + period keyword (no $ needed) ─────────────────
    // 80,000 - 120,000 per year  |  80k to 100k / yr
    /[\d,]{4,}(?:\.\d+)?[kK]?\s*[-–—~to]+\s*[\d,]{4,}(?:\.\d+)?[kK]?\s*(?:per\s+(?:year|hour|hr|month|annum)|\/(?:yr|year|hr|hour))/i,
    // ── Last resort: single large $ value ─────────────────────────────────
    /[$£€]\s*[\d,]{4,}(?:\.\d+)?[kK]?/,
  ];

  function firstMatch(text) {
    for (const p of PATTERNS) {
      const m = text.match(p);
      if (m) return m[0].replace(/\s+/g, ' ').trim();
    }
    return null;
  }

  // 1. Elements explicitly about salary/compensation (intentionally narrow —
  //    broad selectors like [class*="pay"] match "Paid leave" containers)
  const targeted = document.querySelectorAll(
    '[class*="salary" i], [class*="compensation" i], [class*="pay-range" i], ' +
    '[class*="wage" i], [id*="salary" i], [id*="compensation" i], ' +
    '[data-testid*="salary" i], [data-testid*="compensation" i], ' +
    '[data-automation-id*="salary" i], [data-automation-id*="compensation" i], ' +
    '[class*="SalaryEstimate" i], [class*="salary-estimate" i], ' +
    '[class*="remuneration" i], .job-criteria-item, .posting-categories li'
  );
  for (const el of targeted) {
    // Skip containers whose text is clearly a benefits list, not a salary
    const t = (el.innerText || el.textContent).trim();
    if (t.length > 120) continue;
    const hit = firstMatch(t);
    if (hit) return hit;
  }

  // 2. Job description / details section (likely contains "Salary:" prose)
  const descEl = document.querySelector(
    '[class*="description" i], [id*="description" i], ' +
    '[class*="jobDetail" i], [class*="job-detail" i], ' +
    '[data-testid*="description" i], [class*="posting-requirements" i], ' +
    '[class*="jobBody" i], [class*="job-body" i], article, main'
  );
  if (descEl) {
    const hit = firstMatch(descEl.innerText || descEl.textContent);
    if (hit) return hit;
  }

  // 3. Entire page body (no character limit — job descriptions vary in length)
  return firstMatch(document.body?.innerText || '') || '';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function text(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const t = (el.textContent || el.getAttribute('alt') || '').trim();
      if (t) return t;
    }
  }
  return '';
}
