// ═══════════════════════════════════════════════════
//  WHOLESALE REALTORS — script.js
//  Full build: Supabase + OneSignal + Hot Deals + Hero + Videos
// ═══════════════════════════════════════════════════

// ─── SUPABASE CONFIG ───
const SUPABASE_URL = 'https://xkzogdgcvijnahxmfigr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrem9nZGdjdmlqbmFoeG1maWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTA0NzUsImV4cCI6MjA5MjEyNjQ3NX0.LBn0icEb9karrOBt8eSNsCb1zdtzL_DvolvZVpd2YGA';

// ─── ONESIGNAL CONFIG ───
const ONESIGNAL_APP_ID  = '9828e96c-6283-4948-82e7-ceef3e196f6a';
const ONESIGNAL_REST_KEY = 'os_v2_app_tauos3dcqneuraxhz3xt4glpnjk3d7qo7e4em2f3ci2vppp4zy7hedlmev7qdbtuux5bm47mmrjq6jkbnyw2hmtowmvu42nlglsvw2q';
// To get REST key: OneSignal dashboard → Settings → Keys & IDs → REST API Key

// ═══════════════════════════════════════════════════
//  SUPABASE HELPERS
// ═══════════════════════════════════════════════════
const sb = {

  async get(table, filter = '') {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
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
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { raw: text }; }
    if (!res.ok) {
      const msg = result.message || result.hint || result.details || result.raw || JSON.stringify(result);
      throw new Error(`INSERT FAILED (${res.status}): ${msg}`);
    }
    return result;
  },

  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    return res.ok;
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
    if (res.ok) return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    const msg = data.message || data.error || data.raw || JSON.stringify(data);
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

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let logoClicks   = 0;
let logoTimer    = null;
let selectedFiles = [];
let selectedVideos = [];
let allProperties = [];

// ═══════════════════════════════════════════════════
//  NAV & SCROLL
// ═══════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

// ═══════════════════════════════════════════════════
//  LOGO CLICK — 8x = ADMIN
// ═══════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════
//  ADMIN LOGIN
// ═══════════════════════════════════════════════════
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

document.getElementById('adminLoginModal').addEventListener('click', e => {
  if (e.target === document.getElementById('adminLoginModal')) closeAdminLogin();
});

// ═══════════════════════════════════════════════════
//  ADMIN PANEL
// ═══════════════════════════════════════════════════
function openAdmin() {
  document.getElementById('adminPanel').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadManageListings();
  loadLeads();
  loadHeroSelector();
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

// ─── Video Upload Preview ───
document.getElementById('a-video-file') && document.getElementById('a-video-file').addEventListener('change', e => {
  selectedVideos = Array.from(e.target.files).slice(0, 1);
  const box = document.getElementById('videoPreviews');
  box.innerHTML = '';
  if (selectedVideos[0]) {
    const url = URL.createObjectURL(selectedVideos[0]);
    box.innerHTML = `<video src="${url}" controls style="width:100%;border-radius:8px;margin-top:12px;max-height:180px;"></video>
    <button class="btn-delete" style="margin-top:8px;" onclick="selectedVideos=[];document.getElementById('videoPreviews').innerHTML='';">Remove Video</button>`;
  }
});

// ─── PUBLISH PROPERTY ───
document.getElementById('adminPropertyForm').addEventListener('submit', async e => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    alert('Please upload at least one property image.');
    return;
  }

  const btn      = document.getElementById('publishBtn');
  const progressEl = document.getElementById('uploadProgress');
  const fill     = document.getElementById('progressFill');
  const text     = document.getElementById('progressText');

  btn.disabled = true;
  btn.textContent = 'Publishing...';
  progressEl.style.display = 'block';

  try {
    // Upload images
    const imageUrls = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const safeName = file.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
      const path = `${Date.now()}-${i}-${safeName}`;
      text.textContent = `Uploading image ${i + 1} of ${selectedFiles.length}...`;
      fill.style.width = `${Math.round(((i + 0.5) / selectedFiles.length) * 70)}%`;
      const url = await sb.uploadFile('properties', path, file);
      imageUrls.push(url);
    }

    // Upload video if selected
    let videoStorageUrl = document.getElementById('a-video').value.trim();
    if (selectedVideos.length > 0) {
      const vfile = selectedVideos[0];
      const safeName = vfile.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
      const path = `videos/${Date.now()}-${safeName}`;
      text.textContent = 'Uploading video...';
      fill.style.width = '85%';
      videoStorageUrl = await sb.uploadFile('properties', path, vfile);
    }

    text.textContent = 'Saving to database...';
    fill.style.width = '92%';

    const isHotDeal = document.getElementById('a-hotdeal').checked;
    const isHero    = document.getElementById('a-hero').checked;

    // If setting as hero, remove hero from all others first
    if (isHero) {
      const existing = await sb.get('properties', 'is_hero=eq.true');
      if (Array.isArray(existing)) {
        for (const p of existing) {
          await sb.update('properties', p.id, { is_hero: false });
        }
      }
    }

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
      video_url:   videoStorageUrl,
      is_hot_deal: isHotDeal,
      is_hero:     isHero,
      created_at:  new Date().toISOString()
    };

    const insertResult = await sb.insert('properties', property);
    if (insertResult && !Array.isArray(insertResult) && insertResult.code) {
      throw new Error(`DB ERROR ${insertResult.code}: ${insertResult.message || JSON.stringify(insertResult)}`);
    }

    fill.style.width = '100%';
    text.textContent = '✅ Published successfully!';

    setTimeout(() => {
      document.getElementById('adminPropertyForm').reset();
      selectedFiles = [];
      selectedVideos = [];
      document.getElementById('imagePreviews').innerHTML = '';
      document.getElementById('videoPreviews') && (document.getElementById('videoPreviews').innerHTML = '');
      progressEl.style.display = 'none';
      fill.style.width = '0%';
      btn.disabled = false;
      btn.textContent = '🚀 Publish Listing';
      loadProperties();
      loadHotDeals();
      loadHeroCard();
      loadManageListings();
      loadHeroSelector();
      alert('✅ Property published and is now live on your site!');
    }, 1200);

  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
    btn.disabled = false;
    btn.textContent = '🚀 Publish Listing';
    progressEl.style.display = 'none';
  }
});

// ═══════════════════════════════════════════════════
//  LOAD HERO CARD
// ═══════════════════════════════════════════════════
async function loadHeroCard() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&is_hero=eq.true`, {
      headers: sbHeaders()
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return;
    const p = data[0];
    const imgs = parseImages(p.images);
    const thumb = imgs[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';

    const card = document.getElementById('heroCard');
    if (!card) return;

    card.innerHTML = `
      <img src="${thumb}" alt="${esc(p.title)}" style="width:100%;height:260px;object-fit:cover;border-radius:16px 16px 0 0;"/>
      <div class="hero-card-badge">🔥 Hot Deal</div>
      <div class="hero-card-info">
        <span class="hero-card-price">${esc(p.price)}</span>
        <span class="hero-card-loc">📍 ${esc(p.location)}</span>
      </div>
      <div class="hero-card-details">
        ${p.beds  ? `<span>${p.beds} Beds</span>` : ''}
        ${p.baths ? `<span>${p.baths} Baths</span>` : ''}
        ${p.arv   ? `<span>ARV: ${esc(p.arv)}</span>` : ''}
      </div>
    `;
    card.onclick = () => {
      document.getElementById('properties').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => openPropertyModal(p.id), 600);
    };
    card.style.cursor = 'pointer';
  } catch (err) {
    console.warn('Hero card load failed:', err);
  }
}

// ═══════════════════════════════════════════════════
//  LOAD HOT DEALS SECTION
// ═══════════════════════════════════════════════════
async function loadHotDeals() {
  const grid = document.getElementById('hotDealsGrid');
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&is_hot_deal=eq.true`, {
      headers: sbHeaders()
    });
    const data = await res.json();

    const section = document.getElementById('hotDealsSection');
    if (!Array.isArray(data) || data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = 'block';
    data.sort((a, b) => b.id - a.id);
    grid.innerHTML = data.map(buildPropertyCard).join('');
  } catch (err) {
    console.warn('Hot deals load failed:', err);
  }
}

// ═══════════════════════════════════════════════════
//  LOAD PROPERTIES (PUBLIC)
// ═══════════════════════════════════════════════════
async function loadProperties() {
  const grid   = document.getElementById('propertiesGrid');
  const noProp = document.getElementById('noProperties');
  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading available deals...</p></div>';
  noProp.style.display = 'none';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {
      headers: sbHeaders()
    });
    const data = await res.json();

    if (!res.ok || (data && data.code)) {
      const errMsg = data.message || data.hint || data.details || JSON.stringify(data);
      grid.innerHTML = `<div class="loading-state"><p>⚠️ Supabase error: ${errMsg}</p></div>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = '';
      noProp.style.display = 'block';
      return;
    }

    data.sort((a, b) => b.id - a.id);
    allProperties = data;
    noProp.style.display = 'none';
    grid.innerHTML = data.map(buildPropertyCard).join('');

  } catch (err) {
    grid.innerHTML = `<div class="loading-state"><p>⚠️ Network error: ${err.message}</p></div>`;
  }
}

// ─── BUILD PROPERTY CARD ───
function buildPropertyCard(p) {
  const imgs = parseImages(p.images);
  const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';
  const statusClass = {
    'Available':      'status-available',
    'Under Contract': 'status-contract',
    'Sold':           'status-sold'
  }[p.status] || 'status-available';

  const hotBadge = p.is_hot_deal ? `<span class="hot-badge">🔥 Hot Deal</span>` : '';

  return `
    <div class="property-card" onclick="openPropertyModal(${p.id})">
      <div class="prop-img-wrap">
        <img src="${thumb}" alt="${esc(p.title)}" loading="lazy"/>
        <span class="prop-status ${statusClass}">${p.status || 'Available'}</span>
        <span class="prop-deal-type">${p.deal_type || 'Wholesale'}</span>
        ${hotBadge}
      </div>
      <div class="prop-body">
        <div class="prop-price">${esc(p.price)}</div>
        <div class="prop-title">${esc(p.title)}</div>
        <div class="prop-location">📍 ${esc(p.location)}</div>
        <div class="prop-meta">
          ${p.beds  ? `<span>🛏 ${p.beds} Beds</span>` : ''}
          ${p.baths ? `<span>🚿 ${p.baths} Baths</span>` : ''}
          ${p.sqft  ? `<span>📐 ${p.sqft}</span>` : ''}
          ${p.video_url ? `<span>🎥 Video Tour</span>` : ''}
        </div>
        ${p.arv ? `<div class="prop-arv"><span>ARV (After Repair Value)</span><span>${esc(p.arv)}</span></div>` : ''}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════
//  PROPERTY DETAIL MODAL
// ═══════════════════════════════════════════════════
async function openPropertyModal(id) {
  try {
    const data = await sb.get('properties', `id=eq.${id}`);
    if (!data || !data[0]) return;

    const p    = data[0];
    const imgs = parseImages(p.images);
    const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

    // Image gallery
    let galleryHtml = '';
    if (imgs.length > 1) {
      galleryHtml = `
        <div class="modal-gallery">
          ${imgs.map((img, i) => `<img src="${img}" class="gallery-thumb ${i===0?'active':''}" onclick="switchModalImage(this,'${img}')" />`).join('')}
        </div>`;
    }

    // Video
    let videoHtml = '';
    if (p.video_url) {
      const ytId = getYouTubeId(p.video_url);
      if (ytId) {
        videoHtml = `<div class="modal-video"><iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe></div>`;
      } else if (p.video_url.match(/\.(mp4|webm|mov)/i) || p.video_url.includes('supabase')) {
        videoHtml = `<div class="modal-video"><video controls playsinline><source src="${p.video_url}"/></video></div>`;
      } else {
        videoHtml = `<div class="modal-video"><iframe src="${p.video_url}" allowfullscreen></iframe></div>`;
      }
    }

    const hotTag = p.is_hot_deal ? `<span class="hot-badge" style="position:static;margin-bottom:10px;display:inline-block;">🔥 Hot Deal</span>` : '';

    document.getElementById('modalContent').innerHTML = `
      <div class="modal-images" id="modalMainImg">
        <img src="${thumb}" alt="${esc(p.title)}" id="modalHeroImg"/>
      </div>
      ${galleryHtml}
      <div class="modal-body">
        ${hotTag}
        <div class="modal-price">${esc(p.price)}</div>
        <div class="modal-title">${esc(p.title)}</div>
        <div class="modal-location">📍 ${esc(p.location)}</div>
        <div class="modal-stats">
          ${p.beds        ? `<div class="modal-stat"><span class="label">Bedrooms</span><span class="value">${p.beds}</span></div>` : ''}
          ${p.baths       ? `<div class="modal-stat"><span class="label">Bathrooms</span><span class="value">${p.baths}</span></div>` : ''}
          ${p.sqft        ? `<div class="modal-stat"><span class="label">Sq Ft</span><span class="value">${esc(p.sqft)}</span></div>` : ''}
          ${p.arv         ? `<div class="modal-stat"><span class="label">ARV</span><span class="value">${esc(p.arv)}</span></div>` : ''}
          ${p.deal_type   ? `<div class="modal-stat"><span class="label">Deal Type</span><span class="value">${esc(p.deal_type)}</span></div>` : ''}
          ${p.status      ? `<div class="modal-stat"><span class="label">Status</span><span class="value">${esc(p.status)}</span></div>` : ''}
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

function switchModalImage(thumb, src) {
  document.getElementById('modalHeroImg').src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closePropertyModal() {
  document.getElementById('propertyModal').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('modalClose').addEventListener('click', closePropertyModal);
document.getElementById('propertyModal').addEventListener('click', e => {
  if (e.target === document.getElementById('propertyModal')) closePropertyModal();
});

// ═══════════════════════════════════════════════════
//  MANAGE LISTINGS (ADMIN)
// ═══════════════════════════════════════════════════
async function loadManageListings() {
  const el = document.getElementById('manageListings');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, { headers: sbHeaders() });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<div class="loading-state"><p>No listings yet.</p></div>';
      return;
    }

    data.sort((a, b) => b.id - a.id);
    el.innerHTML = data.map(p => {
      const imgs  = parseImages(p.images);
      const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=60';
      return `
        <div class="manage-listing-item">
          <img class="manage-listing-thumb" src="${thumb}" alt="${esc(p.title)}"/>
          <div class="manage-listing-info">
            <h4>${esc(p.title)}</h4>
            <p>${esc(p.location)} · ${esc(p.price)} · <strong style="color:var(--gold)">${p.status}</strong></p>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              <label class="toggle-label">
                <input type="checkbox" ${p.is_hot_deal ? 'checked' : ''} onchange="toggleHotDeal(${p.id}, this.checked)"/> 🔥 Hot Deal
              </label>
              <label class="toggle-label">
                <input type="checkbox" ${p.is_hero ? 'checked' : ''} onchange="toggleHero(${p.id}, this.checked)"/> ⭐ Show on Hero
              </label>
            </div>
          </div>
          <button class="btn-delete" onclick="deleteListing(${p.id})">🗑</button>
        </div>
      `;
    }).join('');
  } catch (err) {
    el.innerHTML = '<div class="loading-state"><p>⚠️ Failed to load listings.</p></div>';
  }
}

async function toggleHotDeal(id, val) {
  await sb.update('properties', id, { is_hot_deal: val });
  loadProperties();
  loadHotDeals();
}

async function toggleHero(id, val) {
  // Remove hero from all others first
  if (val) {
    const all = await sb.get('properties', 'is_hero=eq.true');
    if (Array.isArray(all)) {
      for (const p of all) {
        if (p.id !== id) await sb.update('properties', p.id, { is_hero: false });
      }
    }
  }
  await sb.update('properties', id, { is_hero: val });
  loadHeroCard();
  loadManageListings();
}

async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  const ok = await sb.remove('properties', id);
  if (ok) { loadManageListings(); loadProperties(); loadHotDeals(); loadHeroCard(); }
  else alert('Delete failed. Please try again.');
}

// ═══════════════════════════════════════════════════
//  HERO SELECTOR (ADMIN TAB)
// ═══════════════════════════════════════════════════
async function loadHeroSelector() {
  const el = document.getElementById('heroSelectorList');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, { headers: sbHeaders() });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<div class="loading-state"><p>No properties yet. Add one first.</p></div>';
      return;
    }

    data.sort((a, b) => b.id - a.id);
    el.innerHTML = data.map(p => {
      const imgs  = parseImages(p.images);
      const thumb = imgs[0] || '';
      return `
        <div class="manage-listing-item ${p.is_hero ? 'hero-active' : ''}" style="cursor:pointer;" onclick="setHero(${p.id})">
          ${thumb ? `<img class="manage-listing-thumb" src="${thumb}" alt=""/>` : ''}
          <div class="manage-listing-info">
            <h4>${esc(p.title)}</h4>
            <p>${esc(p.price)} · ${esc(p.location)}</p>
          </div>
          <span style="color:${p.is_hero ? 'var(--gold)' : 'var(--muted)'};font-size:1.4rem;">${p.is_hero ? '⭐' : '☆'}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    el.innerHTML = '<p style="color:var(--muted)">Failed to load.</p>';
  }
}

async function setHero(id) {
  const all = await sb.get('properties', 'is_hero=eq.true');
  if (Array.isArray(all)) {
    for (const p of all) await sb.update('properties', p.id, { is_hero: false });
  }
  await sb.update('properties', id, { is_hero: true });
  loadHeroCard();
  loadHeroSelector();
  loadManageListings();
  alert('✅ Hero card updated!');
}

// ═══════════════════════════════════════════════════
//  LEADS (ADMIN)
// ═══════════════════════════════════════════════════
async function loadLeads() {
  const el = document.getElementById('leadsList');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading leads...</p></div>';

  try {
    const data = await sb.get('leads');

    if (!Array.isArray(data) || data.length === 0 || data.code) {
      el.innerHTML = '<div class="loading-state"><p>No leads yet — or create a <strong>leads</strong> table in Supabase.</p></div>';
      return;
    }

    data.sort((a, b) => b.id - a.id);
    el.innerHTML = `
      <p style="color:var(--muted);font-size:0.82rem;margin-bottom:16px;">${data.length} lead${data.length !== 1 ? 's' : ''} total</p>
      ${data.map(l => `
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
      `).join('')}
    `;
  } catch (err) {
    el.innerHTML = '<div class="loading-state"><p>⚠️ Create a <strong>leads</strong> table in Supabase.</p></div>';
  }
}

// ═══════════════════════════════════════════════════
//  SEND PUSH NOTIFICATION (ADMIN)
// ═══════════════════════════════════════════════════
async function sendPushNotification() {
  const msg = document.getElementById('notifMessage').value.trim();
  if (!msg) { alert('Please enter a message.'); return; }

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

  // Ask for push notification permission after form submit
  try {
    if (window.OneSignal) {
      await window.OneSignal.Notifications.requestPermission();
    }
  } catch (err) {
    console.warn('OneSignal permission request failed:', err);
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
