const SUPABASE_URL = 'https://oyoisymkncgkfzxabaas.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zq0FRp9CHeLay3zw6e3B7g_lQxe3YnA';
const STORAGE_KEY = 'local-marketplace-listings-v1';
const IMAGE_BUCKET = 'listing-images';
const categories = ['Home & Living', 'Food & Drink', 'Wellness', 'Art & Design', 'Services'];
const sampleListings = [
  { id: 'demo-1', title: 'Sunday Morning Ceramic Mug', business_name: 'Juniper & Clay', category: 'Home & Living', description: 'Hand-thrown stoneware made for slow mornings and long conversations.', price: 32, location: 'Portland, OR', art: '☕', artIndex: 0 },
  { id: 'demo-2', title: 'The Everyday Tote', business_name: 'Good Form Studio', category: 'Art & Design', description: 'A sturdy, screen-printed everyday carry-all designed for city errands and weekend strolls.', price: 28, location: 'Brooklyn, NY', art: '👜', artIndex: 1 },
  { id: 'demo-3', title: 'Small Batch Citrus Honey', business_name: 'Bee Kind Pantry', category: 'Food & Drink', description: 'Raw wildflower honey with a bright citrus finish that feels like sunshine in a jar.', price: 16, location: 'Austin, TX', art: '🍯', artIndex: 2 },
  { id: 'demo-4', title: 'A Softer Sunday Candle', business_name: 'Little Light Co.', category: 'Home & Living', description: 'A slow-burning soy candle with gentle fig and cedar notes for an easy reset.', price: 24, location: 'Asheville, NC', art: '🕯️', artIndex: 3 },
  { id: 'demo-5', title: 'Herbal Reset Tea Blend', business_name: 'Tender Leaf Botanics', category: 'Wellness', description: 'A calming caffeine-free tea blend made to slow the day down.', price: 19, location: 'Seattle, WA', art: '🍵', artIndex: 4 },
  { id: 'demo-6', title: 'Wildflower Print, No. 04', business_name: 'Marlow Paper House', category: 'Art & Design', description: 'An archival botanical print with soft watercolour color.', price: 35, location: 'Hudson, NY', art: '🌼', artIndex: 5 },
  { id: 'demo-7', title: 'Market Day Granola', business_name: 'Sunday Sun Provisions', category: 'Food & Drink', description: 'Crunchy golden clusters with toasted pecans and cinnamon.', price: 14, location: 'Nashville, TN', art: '🥣', artIndex: 6 },
  { id: 'demo-8', title: 'Brand Story Session', business_name: 'Brightside Creative', category: 'Services', description: 'A focused session to clarify your business voice and next move.', price: 85, location: 'Remote', art: '✍️', artIndex: 7 }
];
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);
let listings = [];
let currentUser = null;
let currentProfile = null;
let selectedCategory = 'All';
let searchTerm = '';
let authMode = 'signin';
let toastTimer;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function currency(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0); }
function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}
function showMessage(node, text, isError = false) {
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('error', isError);
}
function getDemoListings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(stored)) return stored;
  } catch (error) { console.warn('Could not read demo listings', error); }
  return [...sampleListings];
}
function filteredListings() {
  const query = searchTerm.trim().toLowerCase();
  return listings.filter((item) => (selectedCategory === 'All' || item.category === selectedCategory) &&
    (!query || [item.title, item.business_name, item.category, item.description].join(' ').toLowerCase().includes(query)));
}
function renderHomeListings() {
  const grid = $('#listing-grid');
  if (!grid) return;
  const results = filteredListings();
  $('#results-count').textContent = searchTerm || selectedCategory !== 'All' ? `${results.length} ${results.length === 1 ? 'find' : 'finds'} for you` : 'A few lovely finds';
  $('#clear-search').classList.toggle('hidden', !searchTerm && selectedCategory === 'All');
  $('#empty-state').classList.toggle('hidden', results.length > 0);
  grid.classList.toggle('hidden', results.length === 0);
  grid.innerHTML = results.map((item, index) => {
    const emoji = item.art || ['☕', '👜', '🍯', '🕯️', '🍵', '🌼', '🥣', '✍️'][index % 8];
    const image = item.image_url ? `<img src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.title)}" loading="lazy">` : `<span class="art" aria-hidden="true">${escapeHTML(emoji)}</span>`;
    return `<article class="listing-card"><a class="listing-visual" data-art="${Number(item.artIndex ?? index) % 8}" href="details.html?id=${encodeURIComponent(item.id)}">${image}<span class="listing-badge">${escapeHTML(item.category || 'Independent')}</span></a><div class="listing-info"><p class="listing-business">${escapeHTML(item.business_name || 'Independent maker')}</p><h3 class="listing-title"><a href="details.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3><div class="listing-bottom"><span class="listing-price">${currency(item.price)}</span><span class="listing-location">${escapeHTML(item.location || 'Made with care')}</span></div></div></article>`;
  }).join('');
}
async function loadListings() {
  if (!db) listings = getDemoListings();
  else {
    const { data, error } = await db.from('listings').select('id,seller_id,title,business_name,category,description,price,location,image_url,status,created_at').eq('status', 'active').order('created_at', { ascending: false });
    if (error) { console.error(error); listings = []; notify('Marketplace data could not be loaded. Check Supabase setup.'); }
    else listings = data || [];
  }
  renderHomeListings(); renderListingDetail(); renderDashboard();
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('selected', tab.dataset.mode === mode));
  if ($('#auth-title')) $('#auth-title').innerHTML = mode === 'signin' ? 'Welcome <em>in.</em>' : 'Join the <em>market.</em>';
  if ($('#auth-submit')) $('#auth-submit').textContent = mode === 'signin' ? 'Log in' : 'Create account';
  if ($('#auth-password')) $('#auth-password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
}
function showAuth(mode = 'signin') {
  if (!db) return notify('Supabase is not available. Check your connection and configuration.');
  setAuthMode(mode); showMessage($('#auth-message'), ''); $('#auth-modal').showModal();
}
async function updateAccountUI(user) {
  currentUser = user || null;
  const authButton = $('#auth-button'); const accountButton = $('#account-button');
  if (authButton) authButton.classList.toggle('hidden', Boolean(currentUser));
  if (accountButton) { accountButton.classList.toggle('hidden', !currentUser); if (currentUser) accountButton.textContent = (currentUser.email || 'Y').slice(0, 1).toUpperCase(); }
  currentProfile = null;
  if (currentUser && db) {
    const { data, error } = await db.from('profiles').select('id,full_name,business_name,bio,location,website').eq('id', currentUser.id).maybeSingle();
    if (error) console.error('Could not load profile', error);
    currentProfile = data || null;
  }
  $('#dashboard-auth-required')?.classList.toggle('hidden', Boolean(currentUser));
  $('#dashboard-content')?.classList.toggle('hidden', !currentUser);
  if (currentUser) fillProfileForm();
  renderDashboard();
  if (currentUser) loadSellerInquiries();
}
function fillProfileForm() {
  if (!currentProfile) return;
  for (const [field, key] of [['profile-name', 'full_name'], ['profile-business', 'business_name'], ['profile-bio', 'bio'], ['profile-location', 'location'], ['profile-website', 'website']]) {
    const element = $(`#${field}`); if (element) element.value = currentProfile[key] || '';
  }
}
function renderDashboard() {
  const list = $('#dashboard-list'); if (!list) return;
  if (!db || !currentUser) { list.innerHTML = '<p class="empty-mini">Sign in with Supabase to manage your listings.</p>'; return; }
  const mine = listings.filter((item) => item.seller_id === currentUser.id);
  list.innerHTML = mine.length ? mine.map((item) => `<div class="dashboard-row"><div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.category)} · ${escapeHTML(item.status)}</span></div><div class="dashboard-row-actions"><span class="dashboard-meta">${currency(item.price)}</span><button type="button" class="button button-outline listing-status" data-id="${escapeHTML(item.id)}" data-status="${item.status}">${item.status === 'active' ? 'Archive' : 'Publish'}</button><button type="button" class="danger-button listing-delete" data-id="${escapeHTML(item.id)}">Delete</button></div></div>`).join('') : '<p class="empty-mini">You have not published any listings yet.</p>';
  if ($('#active-listing-count')) $('#active-listing-count').textContent = String(mine.filter((item) => item.status === 'active').length);
}
function renderListingDetail() {
  const container = $('#listing-detail'); if (!container) return;
  const id = new URLSearchParams(location.search).get('id'); const item = listings.find((listing) => String(listing.id) === id);
  if (!item) { container.innerHTML = `<div class="info-panel"><h2>Listing not found</h2><p>This listing may have been removed or is not available.</p><a class="button button-dark" href="index.html">Back to market</a></div>`; return; }
  const art = item.image_url ? `<img src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.title)}">` : `<span>${escapeHTML(item.art || '✳')}</span>`;
  container.innerHTML = `<div class="detail-hero"><div class="detail-art">${art}</div><div class="detail-copy"><p class="eyebrow">${escapeHTML(item.category)}</p><h1>${escapeHTML(item.title)}</h1><p class="detail-business">by ${escapeHTML(item.business_name)}</p><p class="detail-price">${currency(item.price)}</p><p class="detail-text">${escapeHTML(item.description)}</p><div class="detail-actions"><button class="button button-dark" id="contact-seller" type="button">Contact seller</button><a class="button button-outline" href="index.html#discover">Back to market</a></div><ul class="detail-meta"><li><span>Location</span><strong>${escapeHTML(item.location || 'Remote')}</strong></li><li><span>Independent business</span><strong>${escapeHTML(item.business_name)}</strong></li></ul></div></div>`;
  $('#contact-seller')?.addEventListener('click', () => {
    if (!currentUser) return showAuth('signin');
    if (currentUser.id === item.seller_id) return notify('This is your own listing.');
    $('#inquiry-listing-id').value = item.id; $('#inquiry-seller-id').value = item.seller_id;
    $('#inquiry-title').textContent = `Contact ${item.business_name}`; showMessage($('#inquiry-message'), ''); $('#inquiry-modal').showModal();
  });
}
async function uploadImage(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  return db.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
function initHomePage() {
  if ($('#year')) $('#year').textContent = new Date().getFullYear();
  $('#search-input')?.addEventListener('input', (event) => { searchTerm = event.target.value; renderHomeListings(); });
  $('#search-input')?.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); event.currentTarget.focus(); } });
  document.querySelectorAll('.category-chip').forEach((chip) => chip.addEventListener('click', () => { selectedCategory = chip.dataset.category; document.querySelectorAll('.category-chip').forEach((node) => node.classList.toggle('selected', node === chip)); renderHomeListings(); }));
  $('#clear-search')?.addEventListener('click', () => { searchTerm = ''; selectedCategory = 'All'; $('#search-input').value = ''; document.querySelectorAll('.category-chip').forEach((node) => node.classList.toggle('selected', node.dataset.category === 'All')); renderHomeListings(); });
  $('#reset-filters')?.addEventListener('click', () => $('#clear-search')?.click());
  $('#auth-button')?.addEventListener('click', () => showAuth('signin'));
  $('#sell-button')?.addEventListener('click', () => currentUser ? location.assign('dashboard.html') : showAuth('signup'));
  $('#banner-sell-button')?.addEventListener('click', () => currentUser ? location.assign('dashboard.html') : showAuth('signup'));
  $('#account-button')?.addEventListener('click', async () => { if (!db) return; const { error } = await db.auth.signOut(); if (error) return notify(error.message); await updateAccountUI(null); notify('You have been logged out.'); });
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.mode)));
  $('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const email = $('#auth-email').value.trim(); const password = $('#auth-password').value;
    const result = authMode === 'signup' ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password });
    if (result.error) return showMessage($('#auth-message'), result.error.message, true);
    if (authMode === 'signup' && !result.data.session) return showMessage($('#auth-message'), 'Account created. Check your email to confirm, then log in.');
    await updateAccountUI(result.data.user); $('#auth-modal').close(); notify(authMode === 'signup' ? 'Welcome to the market!' : 'You are logged in.');
  });
  $('#inquiry-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const message = $('#inquiry-text').value.trim();
    const { error } = await db.from('inquiries').insert({ listing_id: $('#inquiry-listing-id').value, seller_id: $('#inquiry-seller-id').value, buyer_id: currentUser.id, message });
    if (error) return showMessage($('#inquiry-message'), error.message, true);
    $('#inquiry-modal').close(); $('#inquiry-form').reset(); notify('Your inquiry was sent to the seller.');
  });
  $('#listing-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const message = $('#listing-message'); showMessage(message, 'Publishing…');
    try {
      if (!db || !currentUser) throw new Error('Sign in before publishing a listing.');
      const imageUrl = await uploadImage($('#listing-image').files[0]);
      const payload = { seller_id: currentUser.id, title: $('#listing-name').value.trim(), category: $('#listing-category').value, description: $('#listing-description').value.trim(), price: Number($('#listing-price').value), business_name: $('#listing-business').value.trim(), location: $('#listing-location').value.trim() || currentProfile?.location || null, image_url: imageUrl, status: 'active' };
      const { error } = await db.from('listings').insert(payload); if (error) throw error;
      $('#listing-modal').close(); $('#listing-form').reset(); await loadListings(); notify('Your listing is live!');
    } catch (error) { showMessage(message, error.message || 'Could not publish listing.', true); }
  });
  const authParam = new URLSearchParams(location.search).get('auth'); if (authParam === 'signin' || authParam === 'signup') showAuth(authParam);
}
function initDashboardPage() {
  $('#profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = { id: currentUser.id, full_name: $('#profile-name').value.trim(), business_name: $('#profile-business').value.trim(), bio: $('#profile-bio').value.trim(), location: $('#profile-location').value.trim(), website: $('#profile-website').value.trim() || null, updated_at: new Date().toISOString() };
    const { error } = await db.from('profiles').upsert(payload); if (error) return showMessage($('#profile-message'), error.message, true);
    currentProfile = payload; showMessage($('#profile-message'), 'Business profile saved.');
  });
  $('#dashboard-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const message = $('#dashboard-message'); showMessage(message, 'Publishing…');
    try {
      if (!db || !currentUser) throw new Error('Sign in to publish listings.');
      const imageUrl = await uploadImage($('#dashboard-image').files[0]);
      const payload = { seller_id: currentUser.id, title: $('#dashboard-title').value.trim(), category: $('#dashboard-category').value, business_name: $('#dashboard-business').value.trim() || currentProfile?.business_name, price: Number($('#dashboard-price').value), description: $('#dashboard-description').value.trim(), location: currentProfile?.location || null, image_url: imageUrl, status: 'active' };
      if (!payload.business_name) throw new Error('Add a business name to your profile first.');
      const { error } = await db.from('listings').insert(payload); if (error) throw error;
      $('#dashboard-form').reset(); showMessage(message, 'Listing published.'); await loadListings();
    } catch (error) { showMessage(message, error.message || 'Could not publish listing.', true); }
  });
  $('#dashboard-list')?.addEventListener('click', async (event) => {
    const statusButton = event.target.closest('.listing-status'); const deleteButton = event.target.closest('.listing-delete');
    if (statusButton) { const status = statusButton.dataset.status === 'active' ? 'archived' : 'active'; const { error } = await db.from('listings').update({ status, updated_at: new Date().toISOString() }).eq('id', statusButton.dataset.id).eq('seller_id', currentUser.id); if (error) return notify(error.message); await loadListings(); }
    if (deleteButton && window.confirm('Delete this listing? This cannot be undone.')) { const { error } = await db.from('listings').delete().eq('id', deleteButton.dataset.id).eq('seller_id', currentUser.id); if (error) return notify(error.message); await loadListings(); notify('Listing deleted.'); }
  });
}
async function loadSellerInquiries() {
  const section = $('#inquiries-list'); if (!section || !db || !currentUser) return;
  const { data, error } = await db.from('inquiries').select('id,message,status,created_at,listings(title)').eq('seller_id', currentUser.id).order('created_at', { ascending: false });
  if (error) { section.innerHTML = `<p class="empty-mini">${escapeHTML(error.message)}</p>`; return; }
  section.innerHTML = data?.length ? data.map((item) => `<article class="dashboard-row"><div><strong>${escapeHTML(item.listings?.title || 'Listing inquiry')}</strong><span>${escapeHTML(item.message)}</span></div><span class="dashboard-meta">${new Date(item.created_at).toLocaleDateString()}</span></article>`).join('') : '<p class="empty-mini">No inquiries yet. Customer messages will appear here.</p>';
}
document.addEventListener('DOMContentLoaded', async () => {
  if (!db) { listings = getDemoListings(); renderHomeListings(); renderListingDetail(); renderDashboard(); $('#dashboard-auth-required')?.classList.remove('hidden'); $('#dashboard-content')?.classList.add('hidden'); initHomePage(); initDashboardPage(); return; }
  initHomePage(); initDashboardPage(); await loadListings();
  const { data: { session } } = await db.auth.getSession(); await updateAccountUI(session?.user || null);
  db.auth.onAuthStateChange((_event, sessionNow) => { setTimeout(() => updateAccountUI(sessionNow?.user || null), 0); });
});
