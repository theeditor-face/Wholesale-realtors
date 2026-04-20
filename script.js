  if (ONESIGNAL_REST_KEY === 'PASTE_YOUR_ONESIGNAL_REST_API_KEY_HERE') {
    alert('⚠️ Please paste your OneSignal REST API Key in script.js first.\n\nFind it at: OneSignal dashboard → Settings → Keys & IDs → REST API Key');
    return;
  }

  const btn = document.getElementById('sendNotifBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['Total Subscribed'],
        contents: { en: msg },
        name: 'Wholesale Realtors — Admin Push'
      })
    });

    const data = await res.json();

    if (data.id) {
      alert(`✅ Notification sent to ${data.recipients || 'all'} subscribers!`);
      document.getElementById('notifMessage').value = '';
    } else {
      alert(`⚠️ Send failed: ${JSON.stringify(data.errors || data)}`);
    }
  } catch (err) {
    alert(`Error sending notification: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '📣 Send Notification';
  }
}

// ═══════════════════════════════════════════════════
//  BUYER FORM SUBMISSION
// ═══════════════════════════════════════════════════
document.getElementById('buyerForm').addEventListener('submit', async e => {
  e.preventDefault();

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const types = Array.from(document.querySelectorAll('.type-check input:checked')).map(cb => cb.value);

  const lead = {
    full_name:      document.getElementById('fname').value.trim(),
    email:          document.getElementById('femail').value.trim(),
    phone:          document.getElementById('fphone').value.trim(),
    budget:         document.getElementById('fbudget').value,
    states:         document.getElementById('fstates').value.trim(),
    property_types: types.join(', '),
    created_at:     new Date().toISOString()
  };

  try {
    await sb.insert('leads', lead);
  } catch (err) {
    console.warn('Lead save error (leads table may not exist):', err.message);
  }

  document.getElementById('buyerForm').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
  btn.disabled = false;
  btn.textContent = 'Join Buyers List →';
});

// ═══════════════════════════════════════════════════
//  STATS COUNTER ANIMATION
// ═══════════════════════════════════════════════════
function runCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let count = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      count += step;
      if (count >= target) { count = target; clearInterval(timer); }
      el.textContent = Math.floor(count);
    }, 25);
  });
}

const heroObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { runCounters(); heroObs.disconnect(); } });
}, { threshold: 0.4 });
const heroEl = document.querySelector('.hero');
if (heroEl) heroObs.observe(heroEl);

// ═══════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════
function parseImages(val) {
  if (!val) return [];
  try { return JSON.parse(val); }
  catch { return [val]; }
}

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  loadHotDeals();
  loadHeroCard();
});
