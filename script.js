// ═══════════════════════════════════════════════════
//  WHOLESALE REALTORS — script.js
//  Multi-page | Supabase | Mortgage Calc | Map | Admin
// ═══════════════════════════════════════════════════

const SUPABASE_URL = 'https://xkzogdgcvijnahxmfigr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrem9nZGdjdmlqbmFoeG1maWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTA0NzUsImV4cCI6MjA5MjEyNjQ3NX0.LBn0icEb9karrOBt8eSNsCb1zdtzL_DvolvZVpd2YGA';

// ─── SUPABASE ───
const sb = {
  async get(table, filter='') {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    if (filter) url += `&${filter}`;
    const res = await fetch(url, { headers: sbH() });
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:'POST', headers:{...sbH(),'Prefer':'return=representation'},
      body:JSON.stringify(data)
    });
    const text = await res.text();
    let r; try { r=JSON.parse(text); } catch { r={raw:text}; }
    if (!res.ok) throw new Error(`INSERT FAILED (${res.status}): ${r.message||r.hint||r.raw||JSON.stringify(r)}`);
    return r;
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:'PATCH', headers:{...sbH(),'Prefer':'return=representation'},
      body:JSON.stringify(data)
    });
    return res.ok;
  },
  async remove(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:'DELETE', headers:sbH()
    });
    return res.ok;
  },
  async uploadFile(bucket, path, file) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':file.type,'x-upsert':'true'},
      body:file
    });
    const text = await res.text();
    let d; try { d=JSON.parse(text); } catch { d={raw:text}; }
    if (res.ok) return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    throw new Error(`STORAGE (${res.status}): ${d.message||d.error||d.raw||JSON.stringify(d)}`);
  }
};
function sbH() {
  return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'};
}

// ─── THEME ───
function initTheme() {
  const saved = localStorage.getItem('wr-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️ Light' : '🌙 Dark';
}
function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wr-theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
}
document.getElementById('themeToggle') && document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// ─── NAV ───
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});
document.getElementById('hamburger') && document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});
function closeMobile() {
  const m = document.getElementById('mobileMenu');
  if (m) m.classList.remove('open');
}

// ─── LOGO 8x → ADMIN ───
let logoClicks = 0, logoTimer = null;
const logoEl = document.getElementById('logoTrigger');
if (logoEl) {
  logoEl.addEventListener('click', () => {
    logoClicks++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 2500);
    if (logoClicks >= 8) {
      logoClicks = 0;
      window.location.href = 'admin.html';
    }
  });
}

// ─── TAWK ───
function openTawk() {
  if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
    window.Tawk_API.maximize();
  }
}

// ─── UTILS ───
function parseImages(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return [val]; }
}
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function parsePriceNum(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/[^0-9.]/g,'')) || 0;
}
function fmtCurrency(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ─── BUILD PROPERTY CARD (shared) ───
function buildCard(p) {
  const imgs = parseImages(p.images);
  const thumb = imgs[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80';
  const statusClass = {'Available':'status-available','Under Contract':'status-contract','Sold':'status-sold'}[p.status]||'status-available';
  const hotBadge = p.is_hot_deal ? `<span class="hot-badge">🔥 Hot Deal</span>` : '';
  const vidBadge = p.video_url ? `<span style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);color:white;padding:3px 10px;border-radius:6px;font-size:0.68rem;">🎥 Video</span>` : '';
  return `
    <a class="property-card" href="listing.html?id=${p.id}">
      <div class="prop-img-wrap">
        <img src="${thumb}" alt="${esc(p.title)}" loading="lazy"/>
        <span class="prop-status ${statusClass}">${p.status||'Available'}</span>
        <span class="prop-deal-type">${p.deal_type||'Wholesale'}</span>
        ${hotBadge}${vidBadge}
      </div>
      <div class="prop-body">
        <div class="prop-price">${esc(p.price)}</div>
        <div class="prop-title">${esc(p.title)}</div>
        <div class="prop-location">📍 ${esc(p.location)}</div>
        <div class="prop-meta">
          ${p.beds?`<span>🛏 ${p.beds} Beds</span>`:''}
          ${p.baths?`<span>🚿 ${p.baths} Baths</span>`:''}
          ${p.sqft?`<span>📐 ${esc(p.sqft)}</span>`:''}
          ${p.year_built?`<span>🏗 ${esc(p.year_built)}</span>`:''}
        </div>
        ${p.arv?`<div class="prop-arv"><span>ARV (After Repair Value)</span><span>${esc(p.arv)}</span></div>`:''}
      </div>
    </a>`;
}

// ════════════════════════════════════════════════
//  INDEX PAGE
// ════════════════════════════════════════════════
async function initIndex() {
  // Stat counters
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        document.querySelectorAll('.stat-num').forEach(el => {
          const target = parseInt(el.dataset.target);
          let count = 0, step = target/60;
          const t = setInterval(() => {
            count += step;
            if (count >= target) { count=target; clearInterval(t); }
            el.textContent = Math.floor(count);
          }, 25);
        });
        obs.disconnect();
      }
    }, {threshold:0.4});
    obs.observe(heroEl);
  }

  // Load hero card
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&is_hero=eq.true`, {headers:sbH()});
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const p = data[0];
      const imgs = parseImages(p.images);
      const thumb = imgs[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80';
      const card = document.getElementById('heroCard');
      if (card) {
        card.innerHTML = `
          <img src="${thumb}" alt="${esc(p.title)}" style="width:100%;height:240px;object-fit:cover;border-radius:16px 16px 0 0;"/>
          <div class="hero-card-badge">🔥 Hot Deal</div>
          <div class="hero-card-info"><span class="hero-card-price">${esc(p.price)}</span><span class="hero-card-loc">📍 ${esc(p.location)}</span></div>
          <div class="hero-card-details">
            ${p.beds?`<span>${p.beds} Beds</span>`:''}
            ${p.baths?`<span>${p.baths} Baths</span>`:''}
            ${p.arv?`<span>ARV: ${esc(p.arv)}</span>`:''}
          </div>`;
        card.onclick = () => window.location.href = `listing.html?id=${p.id}`;
      }
    }
  } catch(e) {}

  // Featured grid (latest 3)
  const grid = document.getElementById('featuredGrid');
  if (grid) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {headers:sbH()});
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a,b) => b.id - a.id);
        grid.innerHTML = data.slice(0,3).map(buildCard).join('');
      } else {
        grid.innerHTML = '<div class="loading-state"><p>New deals coming soon.</p></div>';
      }
    } catch(e) {
      grid.innerHTML = '<div class="loading-state"><p>Could not load properties.</p></div>';
    }
  }
}

// ════════════════════════════════════════════════
//  PROPERTIES PAGE
// ════════════════════════════════════════════════
let allProps = [];

async function initProperties() {
  const grid = document.getElementById('propertiesGrid');
  const noProp = document.getElementById('noProperties');
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {headers:sbH()});
    const data = await res.json();

    if (!res.ok || data.code) {
      grid.innerHTML = `<div class="loading-state"><p>⚠️ ${data.message||'Error loading properties'}</p></div>`;
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = '';
      if (noProp) noProp.style.display = 'block';
      return;
    }
    data.sort((a,b) => b.id - a.id);
    allProps = data;
    renderProperties(data);
  } catch(e) {
    grid.innerHTML = `<div class="loading-state"><p>⚠️ Network error: ${e.message}</p></div>`;
  }
}

function renderProperties(data) {
  const grid = document.getElementById('propertiesGrid');
  const noProp = document.getElementById('noProperties');
  const count = document.getElementById('filterCount');
  if (!grid) return;
  if (data.length === 0) {
    grid.innerHTML = '';
    if (noProp) noProp.style.display = 'block';
    if (count) count.textContent = '0 properties';
    return;
  }
  if (noProp) noProp.style.display = 'none';
  if (count) count.textContent = `${data.length} propert${data.length===1?'y':'ies'}`;
  grid.innerHTML = data.map(buildCard).join('');
}

function filterProperties() {
  const status = document.getElementById('filterStatus')?.value || '';
  const type   = document.getElementById('filterType')?.value   || '';
  const search = document.getElementById('filterSearch')?.value?.toLowerCase() || '';
  const filtered = allProps.filter(p => {
    if (status && p.status !== status) return false;
    if (type   && p.deal_type !== type) return false;
    if (search && !( (p.location||'').toLowerCase().includes(search) || (p.title||'').toLowerCase().includes(search) )) return false;
    return true;
  });
  renderProperties(filtered);
}

// ════════════════════════════════════════════════
//  HOT DEALS PAGE
// ════════════════════════════════════════════════
async function initHotDeals() {
  const grid = document.getElementById('hotDealsGrid');
  const noEl = document.getElementById('noHotDeals');
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&is_hot_deal=eq.true`, {headers:sbH()});
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = '';
      if (noEl) noEl.style.display = 'block';
      return;
    }
    data.sort((a,b) => b.id - a.id);
    grid.innerHTML = data.map(buildCard).join('');
  } catch(e) {
    grid.innerHTML = `<div class="loading-state"><p>⚠️ ${e.message}</p></div>`;
  }
}

// ════════════════════════════════════════════════
//  LISTING PAGE
// ════════════════════════════════════════════════
let currentProperty = null;
let galleryImages = [];
let galleryIndex = 0;

async function initListing() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'properties.html'; return; }

  try {
    const data = await sb.get('properties', `id=eq.${id}`);
    if (!Array.isArray(data) || !data[0]) { window.location.href = 'properties.html'; return; }
    currentProperty = data[0];
    renderListing(currentProperty);
    loadSimilar(currentProperty);
  } catch(e) {
    document.getElementById('listingLoading').innerHTML = `<div style="text-align:center;padding:80px;"><p style="color:var(--text-muted);">⚠️ Could not load property: ${e.message}</p><a href="properties.html" style="color:var(--gold);">← Back to Properties</a></div>`;
  }
}

function renderListing(p) {
  const imgs = parseImages(p.images);
  galleryImages = imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80'];

  // Show content
  document.getElementById('listingLoading').style.display = 'none';
  document.getElementById('listingContent').style.display = 'block';

  // Title
  document.title = `${p.title} — Wholesale Realtors`;

  // Photos
  document.getElementById('mainPhoto').src = galleryImages[0];
  document.getElementById('mainPhoto').alt = p.title;
  document.getElementById('photoCountNum').textContent = galleryImages.length;

  // Badges
  const statusClass = {'Available':'status-available','Under Contract':'status-contract','Sold':'status-sold'}[p.status]||'status-available';
  let badges = `<span class="prop-status ${statusClass}" style="position:static;">${p.status||'Available'}</span>`;
  if (p.is_hot_deal) badges += `<span class="hot-badge" style="position:static;">🔥 Hot Deal</span>`;
  document.getElementById('listingBadges').innerHTML = badges;

  // Breadcrumb
  document.getElementById('breadcrumbTitle').textContent = p.title;

  // Price
  const priceNum = parsePriceNum(p.price);
  document.getElementById('listingPrice').textContent = p.price || 'Contact for Price';

  // Est mortgage
  if (priceNum > 0) {
    const monthly = calcMonthly(priceNum, 20, 7, 360);
    document.getElementById('listingMortgage').innerHTML = `Est. Mortgage: <strong>${fmtCurrency(monthly)}/mo</strong> (20% down, 7% rate, 30yr)`;
  }

  // Address
  document.getElementById('listingAddress').textContent = `📍 ${p.location||''}`;

  // Quick stats
  const stats = [];
  if (p.beds)       stats.push({val:p.beds,     label:'Beds'});
  if (p.baths)      stats.push({val:p.baths,    label:'Baths'});
  if (p.sqft)       stats.push({val:p.sqft,     label:'Sq Ft'});
  if (p.lot_size)   stats.push({val:p.lot_size, label:'Lot Size'});
  if (p.year_built) stats.push({val:p.year_built,label:'Year Built'});
  if (p.price_per_sqft) stats.push({val:p.price_per_sqft,label:'$/Sqft'});
  document.getElementById('quickStats').innerHTML = stats.map(s =>
    `<div class="quick-stat"><span class="qs-val">${esc(String(s.val))}</span><span class="qs-label">${s.label}</span></div>`
  ).join('');

  // ARV
  if (p.arv) {
    const arvNum = parsePriceNum(p.arv);
    const profit = arvNum - priceNum;
    document.getElementById('arvHighlight').style.display = 'flex';
    document.getElementById('arvVal').textContent = p.arv;
    if (profit > 0) document.getElementById('arvProfit').textContent = `Potential equity: ${fmtCurrency(profit)}`;
  }

  // Description
  if (p.description) {
    document.getElementById('descSection').style.display = 'block';
    document.getElementById('listingDesc').textContent = p.description;
  }

  // Interior details
  const interior = buildDetailGrid([
    {label:'Bedrooms',       val:p.beds},
    {label:'Bathrooms',      val:p.baths},
    {label:'Living Area',    val:p.sqft},
    {label:'Number of Rooms',val:p.num_rooms},
    {label:'Bedroom Details',val:p.bed_details, full:true},
    {label:'Bathroom Details',val:p.bath_details, full:true},
    {label:'Stories / Levels',val:p.stories},
    {label:'Basement',       val:p.basement},
    {label:'Flooring',       val:p.flooring},
    {label:'Windows',        val:p.windows},
    {label:'Fireplace',      val:p.fireplace},
    {label:'Heating & Cooling',val:p.heating_cooling},
    {label:'Security System',val:p.security},
    {label:'Appliances',     val:p.appliances, full:true},
  ]);
  if (interior) { document.getElementById('interiorGrid').innerHTML = interior; }
  else          { document.getElementById('interiorSection').style.display = 'none'; }

  // Exterior details
  const exterior = buildDetailGrid([
    {label:'Roof',           val:p.roof},
    {label:'Patio/Porch/Deck',val:p.patio},
    {label:'Fencing',        val:p.fencing},
    {label:'Foundation',     val:p.foundation},
    {label:'Parking/Garage', val:p.parking},
    {label:'Pool',           val:p.pool},
  ]);
  if (exterior) { document.getElementById('exteriorGrid').innerHTML = exterior; }
  else          { document.getElementById('exteriorSection').style.display = 'none'; }

  // Property info
  const propInfo = buildDetailGrid([
    {label:'Year Built',         val:p.year_built},
    {label:'Property Type',      val:p.property_type},
    {label:'Construction',       val:p.construction},
    {label:'Lot Size',           val:p.lot_size},
    {label:'HOA',                val:p.hoa},
    {label:'Price Per Sqft',     val:p.price_per_sqft},
    {label:'Deal Type',          val:p.deal_type},
    {label:'MLS Status',         val:p.status},
  ]);
  if (propInfo) { document.getElementById('propInfoGrid').innerHTML = propInfo; }
  else          { document.getElementById('propInfoSection').style.display = 'none'; }

  // Location
  const location = buildDetailGrid([
    {label:'Community',          val:p.community},
    {label:'Elementary School',  val:p.school_elementary},
    {label:'Middle School',      val:p.school_middle},
    {label:'High School',        val:p.school_high},
  ]);
  if (location || p.location) {
    if (location) document.getElementById('locationGrid').innerHTML = location;
    // Map
    if (p.location) {
      const mapQ = encodeURIComponent(p.location);
      document.getElementById('listingMap').innerHTML = `<iframe src="https://maps.google.com/maps?q=${mapQ}&output=embed&z=15" loading="lazy" allowfullscreen></iframe>`;
    }
  } else {
    document.getElementById('locationSection').style.display = 'none';
  }

  // Video
  if (p.video_url) {
    document.getElementById('videoSection').style.display = 'block';
    const ytId = getYouTubeId(p.video_url);
    if (ytId) {
      document.getElementById('listingVideo').innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe>`;
    } else if (p.video_url.match(/\.(mp4|webm|mov)/i) || p.video_url.includes('supabase')) {
      document.getElementById('listingVideo').innerHTML = `<video controls playsinline><source src="${p.video_url}"/></video>`;
    } else {
      document.getElementById('listingVideo').innerHTML = `<iframe src="${p.video_url}" allowfullscreen></iframe>`;
    }
  }

  // Price history
  if (p.price_history) {
    document.getElementById('priceHistSection').style.display = 'block';
    document.getElementById('priceHistory').innerHTML = `
      <div class="price-history-item">
        <span class="ph-date">${fmtDate(p.created_at)}</span>
        <span class="ph-event">Listed</span>
        <span class="ph-price">${esc(p.price)}</span>
      </div>
      ${p.price_history ? `<div class="price-history-item"><span class="ph-date">History</span><span class="ph-event">${esc(p.price_history)}</span><span class="ph-price"></span></div>` : ''}`;
  }

  // Mortgage calculator init
  if (priceNum > 0) {
    const slider = document.getElementById('calcPrice');
    if (slider) {
      slider.value = Math.min(priceNum, 2000000);
      slider.max = Math.max(priceNum * 2, 1000000);
      updateCalc();
    }
  }

  // Contact form pre-fill
  const msgEl = document.getElementById('cf-message');
  if (msgEl) msgEl.placeholder = `I am interested in ${p.location}`;

  const emailLink = document.getElementById('emailLink');
  if (emailLink) emailLink.href = `mailto:jakecarter.homebuyers@gmail.com?subject=Interest in ${encodeURIComponent(p.title)}&body=I am interested in the property at ${encodeURIComponent(p.location)}.`;
}

function buildDetailGrid(fields) {
  const items = fields.filter(f => f.val);
  if (items.length === 0) return null;
  return items.map(f =>
    `<div class="detail-item${f.full?' detail-full':''}">
      <span class="detail-label">${f.label}</span>
      <span class="detail-value">${esc(String(f.val))}</span>
    </div>`
  ).join('');
}

// Gallery
function openGallery(idx) {
  galleryIndex = idx;
  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('galleryMainImg').src = galleryImages[galleryIndex];
  const thumbs = document.getElementById('galleryThumbs');
  thumbs.innerHTML = galleryImages.map((img,i) =>
    `<img src="${img}" class="gallery-thumb-item ${i===galleryIndex?'active':''}" onclick="setGalleryImg(${i})"/>`
  ).join('');
}
function closeGallery() {
  const modal = document.getElementById('galleryModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
function galleryNav(dir) {
  galleryIndex = (galleryIndex + dir + galleryImages.length) % galleryImages.length;
  document.getElementById('galleryMainImg').src = galleryImages[galleryIndex];
  document.querySelectorAll('.gallery-thumb-item').forEach((t,i) => t.classList.toggle('active', i===galleryIndex));
}
function setGalleryImg(i) {
  galleryIndex = i;
  document.getElementById('galleryMainImg').src = galleryImages[i];
  document.querySelectorAll('.gallery-thumb-item').forEach((t,j) => t.classList.toggle('active', j===i));
}

// Similar homes
async function loadSimilar(p) {
  const grid = document.getElementById('similarGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {headers:sbH()});
    const data = await res.json();
    const similar = data.filter(x => x.id !== p.id).slice(0, 3);
    if (similar.length === 0) {
      grid.closest('.similar-section').style.display = 'none';
      return;
    }
    grid.innerHTML = similar.map(buildCard).join('');
  } catch(e) {
    grid.closest('.similar-section').style.display = 'none';
  }
}

// Contact form on listing
async function submitContactForm() {
  const name = document.getElementById('cf-name')?.value.trim();
  const phone = document.getElementById('cf-phone')?.value.trim();
  const email = document.getElementById('cf-email')?.value.trim();
  const message = document.getElementById('cf-message')?.value.trim();
  if (!name || !email) { alert('Please enter your name and email.'); return; }

  try {
    await sb.insert('leads', {
      full_name: name, phone, email,
      states: currentProperty?.location || '',
      property_types: currentProperty?.title || '',
      budget: message || `Interested in ${currentProperty?.location}`,
      created_at: new Date().toISOString()
    });
  } catch(e) { console.warn('Lead save:', e.message); }

  document.getElementById('listingContactForm').style.display = 'none';
  document.getElementById('cfSuccess').style.display = 'block';
}

// ─── MORTGAGE CALCULATOR ───
function calcMonthly(price, downPct, rate, termMonths) {
  const principal = price * (1 - downPct/100);
  const r = (rate/100) / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1+r, termMonths)) / (Math.pow(1+r, termMonths) - 1);
}

function updateCalc() {
  const priceSlider = document.getElementById('calcPrice');
  const downSlider  = document.getElementById('calcDown');
  const rateSlider  = document.getElementById('calcRate');
  const termSel     = document.getElementById('calcTerm');
  if (!priceSlider) return;

  const price = parseFloat(priceSlider.value);
  const downPct = parseFloat(downSlider.value);
  const rate = parseFloat(rateSlider.value);
  const term = parseInt(termSel.value);

  const downAmt = price * downPct / 100;
  const pi = calcMonthly(price, downPct, rate, term);
  const tax = price * 0.0086 / 12; // ~0.86% annual
  const ins = 75;
  const total = pi + tax + ins;

  // Labels
  document.getElementById('calcPriceLabel').textContent = fmtCurrency(price);
  document.getElementById('calcDownLabel').textContent  = `${downPct}% (${fmtCurrency(downAmt)})`;
  document.getElementById('calcRateLabel').textContent  = `${parseFloat(rate).toFixed(1)}%`;
  document.getElementById('donutTotal').textContent     = fmtCurrency(total);
  document.getElementById('calcEstLabel').textContent   = `${fmtCurrency(total)}/month`;
  document.getElementById('leg-pi').textContent  = fmtCurrency(pi);
  document.getElementById('leg-tax').textContent = fmtCurrency(tax);
  document.getElementById('leg-ins').textContent = fmtCurrency(ins);

  // Update est mortgage line
  const mortEl = document.getElementById('listingMortgage');
  if (mortEl) mortEl.innerHTML = `Est. Mortgage: <strong>${fmtCurrency(total)}/mo</strong> (${downPct}% down, ${parseFloat(rate).toFixed(1)}% rate)`;

  // Donut SVG
  const circ = 502.65; // 2π × 80
  const piRatio  = pi  / total;
  const taxRatio = tax / total;
  const insRatio = ins / total;

  let offset = 0;
  function seg(id, ratio, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.stroke = color;
    el.style.strokeDasharray = `${ratio*circ} ${circ}`;
    el.style.strokeDashoffset = -offset * circ;
    offset += ratio;
  }

  seg('d-pi',  piRatio,  '#1E3A5F');
  seg('d-tax', taxRatio, '#2DD4BF');
  seg('d-ins', insRatio, '#FBBF24');
}

// ════════════════════════════════════════════════
//  JOIN PAGE
// ════════════════════════════════════════════════
function initJoin() {
  const form = document.getElementById('buyerForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Submitting...';
    const types = Array.from(document.querySelectorAll('.type-check input:checked')).map(cb => cb.value);
    const lead = {
      full_name: document.getElementById('fname').value.trim(),
      email:     document.getElementById('femail').value.trim(),
      phone:     document.getElementById('fphone').value.trim(),
      budget:    document.getElementById('fbudget').value,
      states:    document.getElementById('fstates').value.trim(),
      property_types: types.join(', '),
      created_at: new Date().toISOString()
    };
    try { await sb.insert('leads', lead); } catch(e) { console.warn('Lead save:', e.message); }
    document.getElementById('buyerForm').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    btn.disabled = false; btn.textContent = 'Join Buyers List →';
  });
}

// ════════════════════════════════════════════════
//  ADMIN PAGE
// ════════════════════════════════════════════════
let selectedFiles = [], selectedVideos = [];

function checkPass() {
  const val = document.getElementById('adminPasswordInput')?.value.trim();
  if (val === 'Goku') {
    sessionStorage.setItem('wr-admin', '1');
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminPanelPage').style.display = 'block';
    loadManageListings();
  } else {
    document.getElementById('adminError').style.display = 'block';
    document.getElementById('adminPasswordInput').value = '';
  }
}

function switchTab(btn, tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function initAdmin() {
  if (sessionStorage.getItem('wr-admin') === '1') {
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminPanelPage').style.display = 'block';
    loadManageListings();
  }

  // Image preview
  const imgInput = document.getElementById('a-images');
  if (imgInput) imgInput.addEventListener('change', e => {
    selectedFiles = Array.from(e.target.files);
    const box = document.getElementById('imagePreviews');
    box.innerHTML = '';
    selectedFiles.forEach((file,i) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `<img src="${ev.target.result}"/><button class="remove-img" onclick="removeImg(${i})">✕</button>`;
        box.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  });

  // Video preview
  const vidInput = document.getElementById('a-video-file');
  if (vidInput) vidInput.addEventListener('change', e => {
    selectedVideos = Array.from(e.target.files).slice(0,1);
    const box = document.getElementById('videoPreviews');
    box.innerHTML = '';
    if (selectedVideos[0]) {
      const url = URL.createObjectURL(selectedVideos[0]);
      box.innerHTML = `<video src="${url}" controls style="width:100%;border-radius:8px;margin-top:12px;max-height:180px;"></video>`;
    }
  });

  // Publish form
  const form = document.getElementById('adminPropertyForm');
  if (form) form.addEventListener('submit', publishProperty);
}

function removeImg(i) {
  selectedFiles.splice(i, 1);
  const box = document.getElementById('imagePreviews');
  box.innerHTML = '';
  selectedFiles.forEach((file,j) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.className = 'image-preview-item';
      div.innerHTML = `<img src="${ev.target.result}"/><button class="remove-img" onclick="removeImg(${j})">✕</button>`;
      box.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

async function publishProperty(e) {
  e.preventDefault();
  if (selectedFiles.length === 0) { alert('Please upload at least one image.'); return; }

  const btn  = document.getElementById('publishBtn');
  const prog = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  btn.disabled = true; btn.textContent = 'Publishing...';
  prog.style.display = 'block';

  try {
    // Upload images
    const imageUrls = [];
    for (let i=0; i<selectedFiles.length; i++) {
      const f = selectedFiles[i];
      const path = `${Date.now()}-${i}-${f.name.replace(/[^a-z0-9.]/gi,'-').toLowerCase()}`;
      text.textContent = `Uploading image ${i+1} of ${selectedFiles.length}...`;
      fill.style.width = `${Math.round(((i+0.5)/selectedFiles.length)*65)}%`;
      imageUrls.push(await sb.uploadFile('properties', path, f));
    }

    // Upload video
    let videoUrl = document.getElementById('a-video').value.trim();
    if (selectedVideos.length > 0) {
      const vf = selectedVideos[0];
      const vpath = `videos/${Date.now()}-${vf.name.replace(/[^a-z0-9.]/gi,'-').toLowerCase()}`;
      text.textContent = 'Uploading video...';
      fill.style.width = '80%';
      videoUrl = await sb.uploadFile('properties', vpath, vf);
    }

    text.textContent = 'Saving to database...';
    fill.style.width = '90%';

    const isHero = document.getElementById('a-hero').checked;
    if (isHero) {
      const existing = await sb.get('properties', 'is_hero=eq.true');
      if (Array.isArray(existing)) {
        for (const p of existing) await sb.update('properties', p.id, {is_hero:false});
      }
    }

    function gv(id) { return document.getElementById(id)?.value.trim() || null; }

    const property = {
      title:            gv('a-title'),
      price:            gv('a-price'),
      arv:              gv('a-arv'),
      location:         gv('a-location'),
      beds:             parseInt(gv('a-beds'))||null,
      baths:            parseFloat(gv('a-baths'))||null,
      sqft:             gv('a-sqft'),
      deal_type:        gv('a-deal'),
      status:           gv('a-status'),
      description:      gv('a-description'),
      // Interior
      num_rooms:        gv('a-num-rooms'),
      bed_details:      gv('a-bed-details'),
      bath_details:     gv('a-bath-details'),
      stories:          gv('a-stories'),
      basement:         gv('a-basement'),
      flooring:         gv('a-flooring'),
      windows:          gv('a-windows'),
      fireplace:        gv('a-fireplace'),
      heating_cooling:  gv('a-heating'),
      security:         gv('a-security'),
      appliances:       gv('a-appliances'),
      // Exterior
      roof:             gv('a-roof'),
      patio:            gv('a-patio'),
      fencing:          gv('a-fencing'),
      foundation:       gv('a-foundation'),
      parking:          gv('a-parking'),
      pool:             gv('a-pool'),
      // Property info
      year_built:       gv('a-year-built'),
      property_type:    gv('a-prop-type'),
      construction:     gv('a-construction'),
      lot_size:         gv('a-lot-size'),
      hoa:              gv('a-hoa'),
      price_per_sqft:   gv('a-price-sqft'),
      // Location
      community:        gv('a-community'),
      school_elementary:gv('a-school-elem'),
      school_middle:    gv('a-school-mid'),
      school_high:      gv('a-school-high'),
      // Financial
      price_history:    gv('a-price-history'),
      // Media
      images:           JSON.stringify(imageUrls),
      video_url:        videoUrl,
      is_hot_deal:      document.getElementById('a-hotdeal').checked,
      is_hero:          isHero,
      created_at:       new Date().toISOString()
    };

    const result = await sb.insert('properties', property);
    if (result && !Array.isArray(result) && result.code) {
      throw new Error(`DB: ${result.message||JSON.stringify(result)}`);
    }

    fill.style.width = '100%';
    text.textContent = '✅ Published!';

    setTimeout(() => {
      document.getElementById('adminPropertyForm').reset();
      selectedFiles = []; selectedVideos = [];
      document.getElementById('imagePreviews').innerHTML = '';
      document.getElementById('videoPreviews').innerHTML = '';
      prog.style.display = 'none'; fill.style.width = '0%';
      btn.disabled = false; btn.textContent = '🚀 Publish Listing';
      alert('✅ Property is now live on your site!');
    }, 1200);

  } catch(err) {
    alert(`Error: ${err.message}`);
    btn.disabled = false; btn.textContent = '🚀 Publish Listing';
    prog.style.display = 'none';
  }
}

async function loadManageListings() {
  const el = document.getElementById('manageListings');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {headers:sbH()});
    const data = await res.json();
    if (!Array.isArray(data)||data.length===0) { el.innerHTML='<div class="loading-state"><p>No listings yet.</p></div>'; return; }
    data.sort((a,b)=>b.id-a.id);
    el.innerHTML = data.map(p => {
      const imgs = parseImages(p.images);
      const thumb = imgs[0]||'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&q=60';
      return `
        <div class="manage-listing-item">
          <img class="manage-listing-thumb" src="${thumb}" alt=""/>
          <div class="manage-listing-info">
            <h4>${esc(p.title)}</h4>
            <p>${esc(p.location)} · ${esc(p.price)} · <strong style="color:var(--gold)">${p.status}</strong></p>
            <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;">
              <label class="toggle-label"><input type="checkbox" ${p.is_hot_deal?'checked':''} onchange="toggleHotDeal(${p.id},this.checked)"/> 🔥 Hot Deal</label>
              <label class="toggle-label"><input type="checkbox" ${p.is_hero?'checked':''} onchange="toggleHero(${p.id},this.checked)"/> ⭐ Hero</label>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <a href="listing.html?id=${p.id}" class="btn-outline-gold" style="font-size:0.75rem;padding:6px 12px;" target="_blank">View</a>
            <button class="btn-delete" onclick="deleteListing(${p.id})">🗑 Delete</button>
          </div>
        </div>`;
    }).join('');
  } catch(e) { el.innerHTML=`<div class="loading-state"><p>⚠️ ${e.message}</p></div>`; }
}

async function toggleHotDeal(id, val) {
  await sb.update('properties', id, {is_hot_deal:val});
}
async function toggleHero(id, val) {
  if (val) {
    const all = await sb.get('properties','is_hero=eq.true');
    if (Array.isArray(all)) for (const p of all) if (p.id!==id) await sb.update('properties',p.id,{is_hero:false});
  }
  await sb.update('properties', id, {is_hero:val});
}
async function deleteListing(id) {
  if (!confirm('Delete this listing? Cannot be undone.')) return;
  const ok = await sb.remove('properties', id);
  if (ok) loadManageListings();
  else alert('Delete failed.');
}

async function loadHeroSelector() {
  const el = document.getElementById('heroSelectorList');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {headers:sbH()});
    const data = await res.json();
    if (!Array.isArray(data)||data.length===0) { el.innerHTML='<div class="loading-state"><p>No properties yet.</p></div>'; return; }
    data.sort((a,b)=>b.id-a.id);
    el.innerHTML = data.map(p => {
      const imgs = parseImages(p.images);
      const thumb = imgs[0]||'';
      return `
        <div class="manage-listing-item ${p.is_hero?'hero-active':''}" style="cursor:pointer;" onclick="setHero(${p.id})">
          ${thumb?`<img class="manage-listing-thumb" src="${thumb}" alt=""/>`:''}
          <div class="manage-listing-info"><h4>${esc(p.title)}</h4><p>${esc(p.price)} · ${esc(p.location)}</p></div>
          <span style="font-size:1.4rem;color:${p.is_hero?'var(--gold)':'var(--text-light)'};">${p.is_hero?'⭐':'☆'}</span>
        </div>`;
    }).join('');
  } catch(e) { el.innerHTML=`<p style="color:var(--text-muted)">${e.message}</p>`; }
}

async function setHero(id) {
  const all = await sb.get('properties','is_hero=eq.true');
  if (Array.isArray(all)) for (const p of all) await sb.update('properties',p.id,{is_hero:false});
  await sb.update('properties', id, {is_hero:true});
  loadHeroSelector();
  alert('✅ Hero card updated!');
}

async function loadLeads() {
  const el = document.getElementById('leadsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try {
    const data = await sb.get('leads');
    if (!Array.isArray(data)||data.length===0||data.code) {
      el.innerHTML='<div class="loading-state"><p>No leads yet — or create a <strong>leads</strong> table in Supabase.</p></div>';
      return;
    }
    data.sort((a,b)=>b.id-a.id);
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:14px;">${data.length} lead${data.length!==1?'s':''} total</p>` +
      data.map(l=>`
        <div class="lead-item">
          <h4>${esc(l.full_name||'Unknown')}</h4>
          <div class="lead-meta">
            ${l.email?`<span>📧 ${esc(l.email)}</span>`:''}
            ${l.phone?`<span>📱 ${esc(l.phone)}</span>`:''}
            ${l.budget?`<span>💰 ${esc(l.budget)}</span>`:''}
            ${l.states?`<span>📍 ${esc(l.states)}</span>`:''}
            ${l.property_types?`<span>🏠 ${esc(l.property_types)}</span>`:''}
            <span style="color:var(--text-light);">🕐 ${fmtDate(l.created_at)}</span>
          </div>
        </div>`).join('');
  } catch(e) { el.innerHTML=`<div class="loading-state"><p>⚠️ ${e.message}</p></div>`; }
}

// ════════════════════════════════════════════════
//  INIT — detect page and run
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  if (page === '' || page === 'index.html')      initIndex();
  else if (page === 'properties.html')           initProperties();
  else if (page === 'hot-deals.html')            initHotDeals();
  else if (page === 'listing.html')              initListing();
  else if (page === 'join.html')                 initJoin();
  else if (page === 'admin.html')                initAdmin();
});
