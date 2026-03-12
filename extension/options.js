const fields = ['apiUrl', 'firstName', 'lastName', 'email', 'phone', 'city', 'linkedin', 'github', 'website'];

// Load saved settings on open
document.addEventListener('DOMContentLoaded', async () => {
  const { apiUrl = 'http://localhost:8000', frontendUrl = 'http://localhost:3000', userProfile = {} } = await chrome.storage.local.get(['apiUrl', 'frontendUrl', 'userProfile']);

  document.getElementById('apiUrl').value = apiUrl;
  document.getElementById('frontendUrl').value = frontendUrl;
  document.getElementById('firstName').value = userProfile.firstName || '';
  document.getElementById('lastName').value = userProfile.lastName || '';
  document.getElementById('email').value = userProfile.email || '';
  document.getElementById('phone').value = userProfile.phone || '';
  document.getElementById('city').value = userProfile.city || '';
  document.getElementById('linkedin').value = userProfile.linkedin || '';
  document.getElementById('github').value = userProfile.github || '';
  document.getElementById('website').value = userProfile.website || '';
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiUrl = document.getElementById('apiUrl').value.trim() || 'http://localhost:8000';
  const frontendUrl = document.getElementById('frontendUrl').value.trim() || 'http://localhost:3000';
  const userProfile = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    city: document.getElementById('city').value.trim(),
    linkedin: document.getElementById('linkedin').value.trim(),
    github: document.getElementById('github').value.trim(),
    website: document.getElementById('website').value.trim(),
  };

  await chrome.storage.local.set({ apiUrl, frontendUrl, userProfile });

  const feedback = document.getElementById('feedback');
  feedback.style.display = 'block';
  setTimeout(() => (feedback.style.display = 'none'), 2500);
});
