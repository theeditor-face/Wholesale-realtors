// ═══════════════════════════════════════════════════
//  WHOLESALE REALTORS — script.js
//  Supabase Integration + Admin Panel + UI Logic
// ═══════════════════════════════════════════════════

// ─── SUPABASE CONFIG ───
const SUPABASE_URL = 'https://xkzogdgcvijnahxmfigr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrem9nZGdjdmlqbmFoeG1maWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTA0NzUsImV4cCI6MjA5MjEyNjQ3NX0.LBn0icEb9karrOBt8eSNsCb1zdtzL_DvolvZVpd2YGA';

// ─── SUPABASE HELPERS ───
const sb = {

  async get(table, filter = '') {
    let url = `${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc`;
    if (filter) url += `&${filter}`;
    const res = await fetch(url, { headers: sbHeaders() });
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async remove(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: sbHeaders()
    });
    return res.ok;
  },

  async uploadFile(bucket, path, file) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type,
        'x-upsert': 'true'
      },
      body: file
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // success if HTTP 200 range
    if (res.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/properties/${path}`;
    }

    // Show real error
    const msg = data?.message || data?.error || data?.raw || JSON.stringify(data);
    throw new Error(`STORAGE ERROR (${res.status}): ${msg}`);
  }
};

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

// ─── STATE ───
let logoClicks = 0;
let logoTimer = null;
let selectedFiles = [];

// ════════════════════════════════
//  NAV & SCROLL
// ════════════════════════════════
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

// ════════════════════════════════
//  LOGO CLICK — 8x = ADMIN
// ════════════════════════════════
document.getElementById('logoTrigger').addEventListener('click', () => {
  logoClicks++;
  clearTimeout(logoTimer);
  logoTimer = setTimeout(() => { logoClicks = 0; }, 2500);

  if (logoClicks >= 8) {
    logoClicks = 0;
    document.getElementById('adminLoginModal').style.display = 'flex';
    setTimeout(() => document.getElementById('adminPasswordInput').focus(), 100);
  }
});

// ════════════════════════════════
//  ADMIN LOGIN
// ════════════════════════════════
function closeAdminLogin() {
  document.getElementById('adminLoginModal').style.display = 'none';
  document.getElementById('adminPasswordInput').value = '';
  document.getElementById('adminError').style.display = 'none';
}

function checkAdminPassword() {
  const val = document.getElementById('adminPasswordInput').value.trim();
  if (val === 'Goku') {
    closeAdminLogin();
    openAdmin();
  } else {
    document.getElementById('adminError').style.display = 'block';
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminPasswordInput').focus();
  }
}

document.getElementById('adminPasswordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAdminPassword();
});

// close admin login on overlay click
document.getElementById('adminLoginModal').addEventListener('click', e => {
  if (e.target === document.getElementById('adminLoginModal')) closeAdminLogin();
});

// ════════════════════════════════
//  ADMIN PANEL
// ════════════════════════════════
function openAdmin() {
  document.getElementById('adminPanel').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadManageListings();
  loadLeads();
}

function closeAdmin() {
  document.getElementById('adminPanel').style.display = 'none';
  document.body.style.overflow = '';
}

function switchTab(btn, tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// ─── Image Upload Preview ───
document.getElementById('a-images').addEventListener('change', e => {
  selectedFiles = Array.from(e.target.files);
  renderPreviews();
});

function renderPreviews() {
  const box = document.getElementById('imagePreviews');
  box.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.className = 'image-preview-item';
      div.innerHTML = `<img src="${ev.target.result}" alt=""/><button class="remove-img" onclick="removeImg(${i})">✕</button>`;
      box.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeImg(i) {
  selectedFiles.splice(i, 1);
  renderPreviews();
}

// ─── Publish Property ───
document.getElementById('adminPropertyForm').addEventListener('submit', async e => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    alert('Please upload at least one property image.');
    return;
  }

  const btn = document.getElementById('publishBtn');
  const progressEl = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  btn.disabled = true;
  btn.textContent = 'Publishing...';
  progressEl.style.display = 'block';

  try {
    // Upload images to Supabase Storage
    const imageUrls = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
      const path = `${Date.now()}-${i}-${safeName}`;

      text.textContent = `Uploading image ${i + 1} of ${selectedFiles.length}...`;
      fill.style.width = `${Math.round(((i + 0.5) / selectedFiles.length) * 80)}%`;

      const url = await sb.uploadFile('properties', path, file);
      imageUrls.push(url);
    }

    text.textContent = 'Saving listing to database...';
    fill.style.width = '90%';

    // Build property object
    const property = {
      title:       document.getElementById('a-title').value.trim(),
      price:       document.getElementById('a-price').value.trim(),
      arv:         document.getElementById('a-arv').value.trim(),
      location:    document.getElementById('a-location').value.trim(),
      beds:        parseInt(document.getElementById('a-beds').value) || null,
      baths:       parseFloat(document.getElementById('a-baths').value) || null,
      sqft:        document.getElementById('a-sqft').value.trim(),
      deal_type:   document.getElementById('a-deal').value,
      status:      document.getElementById('a-status').value,
      description: document.getElementById('a-description').value.trim(),
      images:      JSON.stringify(imageUrls),
      video_url:   document.getElementById('a-video').value.trim(),
      created_at:  new Date().toISOString()
    };

    const insertResult = await sb.insert('properties', property);

    // Check if Supabase returned an error object
    if (insertResult && !Array.isArray(insertResult) && insertResult.code) {
      throw new Error('DB ERROR ' + insertResult.code + ': ' + (insertResult.message || insertResult.hint || JSON.stringify(insertResult)));
    }

    fill.style.width = '100%';
    text.textContent = '✅ Published successfully!';

    setTimeout(() => {
      document.getElementById('adminPropertyForm').reset();
      selectedFiles = [];
      document.getElementById('imagePreviews').innerHTML = '';
      progressEl.style.display = 'none';
      fill.style.width = '0%';
      btn.disabled = false;
      btn.textContent = '🚀 Publish Listing';
      loadProperties();
      loadManageListings();
      alert('✅ Property published! It is now live on your site.');
    }, 1500);

  } catch (err) {
    console.error('Publish error:', err);
    alert('Something went wrong. Check your Supabase storage bucket is set to public and the table exists.');
    btn.disabled = false;
    btn.textContent = '🚀 Publish Listing';
    progressEl.style.display = 'none';
  }
});

// ════════════════════════════════
//  LOAD PROPERTIES (PUBLIC)
// ════════════════════════════════
async function loadProperties() {
  const grid = document.getElementById('propertiesGrid');
  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading available deals...</p></div>';

  try {
    const data = await sb.get('properties');

    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = '';
      document.getElementById('noProperties').style.display = 'block';
      return;
    }

    document.getElementById('noProperties').style.display = 'none';
    grid.innerHTML = data.map(buildPropertyCard).join('');

  } catch (err) {
    grid.innerHTML = '<div class="loading-state"><p>⚠️ Could not load properties. Check your Supabase connection.</p></div>';
  }
}

function buildPropertyCard(p) {
  const imgs = parseImages(p.images);
  const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';
  const statusClass = { 'Available': 'status-available', 'Under Contract': 'status-contract', 'Sold': 'status-sold' }[p.status] || 'status-available';

  return `
    <div class="property-card" onclick="openPropertyModal(${p.id})">
      <div class="prop-img-wrap">
        <img src="${thumb}" alt="${esc(p.title)}" loading="lazy"/>
        <span class="prop-status ${statusClass}">${p.status || 'Available'}</span>
        <span class="prop-deal-type">${p.deal_type || 'Wholesale'}</span>
      </div>
      <div class="prop-body">
        <div class="prop-price">${esc(p.price)}</div>
        <div class="prop-title">${esc(p.title)}</div>
        <div class="prop-location">📍 ${esc(p.location)}</div>
        <div class="prop-meta">
          ${p.beds  ? `<span>🛏 ${p.beds} Beds</span>` : ''}
          ${p.baths ? `<span>🚿 ${p.baths} Baths</span>` : ''}
          ${p.sqft  ? `<span>📐 ${p.sqft}</span>` : ''}
        </div>
        ${p.arv ? `<div class="prop-arv"><span>ARV (After Repair Value)</span><span>${esc(p.arv)}</span></div>` : ''}
      </div>
    </div>
  `;
}

// ════════════════════════════════
//  PROPERTY DETAIL MODAL
// ════════════════════════════════
async function openPropertyModal(id) {
  try {
    const data = await sb.get('properties', `id=eq.${id}`);
    if (!data || !data[0]) return;

    const p = data[0];
    const imgs = parseImages(p.images);
    const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

    let videoHtml = '';
    if (p.video_url) {
      const ytId = getYouTubeId(p.video_url);
      videoHtml = `<div class="modal-video">` + (
        ytId
          ? `<iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe>`
          : `<video controls><source src="${p.video_url}"/></video>`
      ) + `</div>`;
    }

    document.getElementById('modalContent').innerHTML = `
      <div class="modal-images"><img src="${thumb}" alt="${esc(p.title)}"/></div>
      <div class="modal-body">
        <div class="modal-price">${esc(p.price)}</div>
        <div class="modal-title">${esc(p.title)}</div>
        <div class="modal-location">📍 ${esc(p.location)}</div>
        <div class="modal-stats">
          ${p.beds        ? `<div class="modal-stat"><span class="label">Bedrooms</span><span class="value">${p.beds}</span></div>` : ''}
          ${p.baths       ? `<div class="modal-stat"><span class="label">Bathrooms</span><span class="value">${p.baths}</span></div>` : ''}
          ${p.sqft        ? `<div class="modal-stat"><span class="label">Sq Footage</span><span class="value">${esc(p.sqft)}</span></div>` : ''}
          ${p.arv         ? `<div class="modal-stat"><span class="label">ARV</span><span class="value">${esc(p.arv)}</span></div>` : ''}
        </div>
        ${p.description ? `<p class="modal-desc">${esc(p.description)}</p>` : ''}
        ${videoHtml}
        <div style="margin-top:24px;">
          <a href="#join" class="btn-primary" onclick="closePropertyModal()">I'm Interested — Join the List →</a>
        </div>
      </div>
    `;

    document.getElementById('propertyModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error(err);
  }
}

function closePropertyModal() {
  document.getElementById('propertyModal').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('modalClose').addEventListener('click', closePropertyModal);
document.getElementById('propertyModal').addEventListener('click', e => {
  if (e.target === document.getElementById('propertyModal')) closePropertyModal();
});

// ════════════════════════════════
//  MANAGE LISTINGS (ADMIN)
// ════════════════════════════════
async function loadManageListings() {
  const el = document.getElementById('manageListings');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const data = await sb.get('properties');

    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<div class="loading-state"><p>No listings yet. Add your first property using the ➕ tab.</p></div>';
      return;
    }

    el.innerHTML = data.map(p => {
      const imgs = parseImages(p.images);
      const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=60';
      return `
        <div class="manage-listing-item">
          <img class="manage-listing-thumb" src="${thumb}" alt="${esc(p.title)}"/>
          <div class="manage-listing-info">
            <h4>${esc(p.title)}</h4>
            <p>${esc(p.location)} · ${esc(p.price)} · <strong style="color:var(--gold)">${p.status}</strong></p>
          </div>
          <button class="btn-delete" onclick="deleteListing(${p.id})">🗑 Delete</button>
        </div>
      `;
    }).join('');

  } catch (err) {
    el.innerHTML = '<div class="loading-state"><p>⚠️ Failed to load listings.</p></div>';
  }
}

async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  const ok = await sb.remove('properties', id);
  if (ok) {
    loadManageListings();
    loadProperties();
  } else {
    alert('Delete failed. Please try again.');
  }
}

// ════════════════════════════════
//  LEADS (ADMIN)
// ════════════════════════════════
async function loadLeads() {
  const el = document.getElementById('leadsList');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading leads...</p></div>';

  try {
    const data = await sb.get('leads');

    if (!Array.isArray(data) || data.length === 0 || data.code) {
      el.innerHTML = '<div class="loading-state"><p>No leads yet — or create a <strong>leads</strong> table in Supabase first (see setup note).</p></div>';
      return;
    }

    el.innerHTML = data.map(l => `
      <div class="lead-item">
        <h4>${esc(l.full_name || 'Unknown')}</h4>
        <div class="lead-meta">
          ${l.email          ? `<span>📧 ${esc(l.email)}</span>` : ''}
          ${l.phone          ? `<span>📱 ${esc(l.phone)}</span>` : ''}
          ${l.budget         ? `<span>💰 ${esc(l.budget)}</span>` : ''}
          ${l.states         ? `<span>📍 ${esc(l.states)}</span>` : ''}
          ${l.property_types ? `<span>🏠 ${esc(l.property_types)}</span>` : ''}
          <span style="color:var(--muted)">🕐 ${formatDate(l.created_at)}</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    el.innerHTML = '<div class="loading-state"><p>⚠️ Create a <strong>leads</strong> table in Supabase to view submissions here.</p></div>';
  }
}

// ════════════════════════════════
//  BUYER FORM SUBMISSION
// ════════════════════════════════
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
    // Show success regardless — leads table may not exist yet
    console.warn('Leads table may not be set up yet:', err);
  }

  document.getElementById('buyerForm').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
});

// ════════════════════════════════
//  STATS COUNTER ANIMATION
// ════════════════════════════════
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

// ════════════════════════════════
//  UTILITIES
// ════════════════════════════════
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

// ════════════════════════════════
//  INIT
// ════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
});
