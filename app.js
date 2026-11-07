/* Supabase setup: set these to your project's URL and publishable/anon key.
   Never put a service_role key in browser code. */
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const sampleListings = [
  { id: 'demo-1', title: 'Sunday Morning Ceramic Mug', business_name: 'Juniper & Clay', category: 'Home & Living', description: 'Hand-thrown stoneware made for slow mornings.', price: 32, location: 'Portland, OR', art: '☕', artIndex: 0 },
  { id: 'demo-2', title: 'The Everyday Tote', business_name: 'Good Form Studio', category: 'Art & Design', description: 'A sturdy, screen-printed everyday carry-all.', price: 28, location: 'Brooklyn, NY', art: '👜', artIndex: 1 },
  { id: 'demo-3', title: 'Small Batch Citrus Honey', business_name: 'Bee Kind Pantry', category: 'Food & Drink', description: 'Raw wildflower honey with a bright citrus lift.', price: 16, location: 'Austin, TX', art: '🍯', artIndex: 2 },
  { id: 'demo-4', title: 'A Softer Sunday Candle', business_name: 'Little Light Co.', category: 'Home & Living', description: 'A slow-burning, soy wax candle with notes of fig.', price: 24, location: 'Asheville, NC', art: '🕯️', artIndex: 3 },
  { id: 'demo-5', title: 'Herbal Reset Tea Blend', business_name: 'Tender Leaf Botanics', category: 'Wellness', description: 'A calming caffeine-free blend, gathered with care.', price: 19, location: 'Seattle, WA', art: '🍵', artIndex: 4 },
  { id: 'demo-6', title: 'Wildflower Print, No. 04', business_name: 'Marlow Paper House', category: 'Art & Design', description: 'An archival botanical print for a little color at home.', price: 35, location: 'Hudson, NY', art: '🌼', artIndex: 5 },
  { id: 'demo-7', title: 'Market Day Granola', business_name: 'Sunday Sun Provisions', category: 'Food & Drink', description: 'Crunchy, golden clusters with toasted local pecans.', price: 14, location: 'Nashville, TN', art: '🥣', artIndex: 6 },
  { id: 'demo-8', title: 'Brand Story Session', business_name: 'Brightside Creative', category: 'Services', description: 'A one-hour session to help your business find its voice.', price: 85, location: 'Remote', art: '✍️', artIndex: 7 }
];

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let listings = [...sampleListings];
let selectedCategory = 'All';
let searchTerm = '';
let authMode = 'signin';
let currentUser = null;
let toastTimer;
const $ = (selector) => document.querySelector(selector);
const grid = $('#listing-grid');

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
function filteredListings() {
  const query = searchTerm.trim().toLowerCase();
  return listings.filter((item) => {
    const categoryMatches = selectedCategory === 'All' || item.category === selectedCategory;
    const haystack = [item.title, item.business_name, item.category, item.description].join(' ').toLowerCase();
    return categoryMatches && (!query || haystack.includes(query));
  });
}
function renderListings() {
  const results = filteredListings();
  $('#results-count').textContent = searchTerm || selectedCategory !== 'All' ? `${results.length} ${results.length === 1 ? 'find' : 'finds'} for you` : 'A few lovely finds';
  $('#clear-search').classList.toggle('hidden', !searchTerm && selectedCategory === 'All');
  $('#empty-state').classList.toggle('hidden', results.length > 0);
  grid.classList.toggle('hidden', results.length === 0);
  grid.innerHTML = results.map((item, index) => {
    const art = item.art || ['✿', '☕', '🌿', '✳'][index % 4];
    const artIndex = Number.isInteger(item.artIndex) ? item.artIndex : index % 8;
    return `<article class="listing-card"><div class="listing-visual" data-art="${artIndex % 8}"><span class="art" aria-hidden="true">${escapeHTML(art)}</span><span class="listing-badge">${escapeHTML(item.category || 'Independent')}</span><button class="favorite-button" type="button" aria-label="Save ${escapeHTML(item.title)}" aria-pressed="false">♡</button></div><div class="listing-info"><p class="listing-business">${escapeHTML(item.business_name || 'Independent maker')}</p><h3 class="listing-title">${escapeHTML(item.title)}</h3><div class="listing-bottom"><span class="listing-price">${currency(item.price)}</span><span class="listing-location">${escapeHTML(item.location || 'Made with care')}</span></div></div></article>`;
  }).join('');
}
async function loadListings() {
  if (!db) return renderListings();
  const { data, error } = await db.from('listings').select('id,title,business_name,category,description,price,location').eq('status', 'active').order('created_at', { ascending: false });
  if (error) {
    console.error('Could not load listings:', error.message);
    notify('Could not load live listings. Showing sample finds instead.');
    return renderListings();
  }
  listings = (data || []).map((item, index) => ({ ...item, artIndex: index % 8, art: ['☕', '👜', '🍯', '🕯️', '🍵', '🌼', '🥣', '✍️'][index % 8] }));
  renderListings();
}
function updateAccountUI(user) {
  currentUser = user;
  $('#auth-button').classList.toggle('hidden', Boolean(user));
  $('#account-button').classList.toggle('hidden', !user);
  if (user) $('#account-button').textContent = (user.email || 'Y').slice(0, 1).toUpperCase();
}
function showAuth(mode = 'signin') {
  setAuthMode(mode);
  $('#auth-message').textContent = '';
  $('#auth-modal').showModal();
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('selected', tab.dataset.mode === mode));
  $('#auth-title').innerHTML = mode === 'signin' ? 'Welcome <em>in.</em>' : 'Join the <em>market.</em>';
  $('#auth-submit').textContent = mode === 'signin' ? 'Log in' : 'Create account';
  $('#auth-password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
}
function openListingForm() {
  if (!currentUser) {
    showAuth('signup');
    notify('Create an account to start selling.');
    return;
  }
  if (!db) {
    notify('Connect Supabase first to publish a listing.');
    return;
  }
  $('#listing-message').textContent = '';
  $('#listing-modal').showModal();
}

$('#year').textContent = new Date().getFullYear();
renderListings();
loadListings();
$('#search-input').addEventListener('input', (event) => { searchTerm = event.target.value; renderListings(); });
$('#search-input').addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); event.currentTarget.focus(); } });
document.querySelectorAll('.category-chip').forEach((chip) => chip.addEventListener('click', () => {
  selectedCategory = chip.dataset.category;
  document.querySelectorAll('.category-chip').forEach((item) => item.classList.toggle('selected', item === chip));
  renderListings();
}));
$('#clear-search').addEventListener('click', () => {
  searchTerm = ''; selectedCategory = 'All'; $('#search-input').value = '';
  document.querySelectorAll('.category-chip').forEach((item) => item.classList.toggle('selected', item.dataset.category === 'All'));
  renderListings();
});
$('#reset-filters').addEventListener('click', () => $('#clear-search').click());
grid.addEventListener('click', (event) => {
  const button = event.target.closest('.favorite-button');
  if (!button) return;
  const saved = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(saved));
  button.classList.toggle('is-favorite', saved);
  button.textContent = saved ? '♥' : '♡';
});
$('#sort-button').addEventListener('click', () => notify('Showing the latest finds first.'));
$('#auth-button').addEventListener('click', () => showAuth('signin'));
$('#sell-button').addEventListener('click', openListingForm);
$('#banner-sell-button').addEventListener('click', openListingForm);
$('#account-button').addEventListener('click', async () => {
  if (!db || !currentUser) return;
  const { error } = await db.auth.signOut();
  if (error) return notify(error.message);
  updateAccountUI(null);
  notify('You have been logged out.');
});
document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.mode)));
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#auth-message');
  message.classList.remove('error');
  if (!db) {
    message.textContent = 'Authentication is ready to connect. Add your Supabase URL and publishable key in app.js, then create the database schema.';
    message.classList.add('error');
    return;
  }
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const result = authMode === 'signup'
    ? await db.auth.signUp({ email, password })
    : await db.auth.signInWithPassword({ email, password });
  if (result.error) {
    message.textContent = result.error.message;
    message.classList.add('error');
    return;
  }
  if (authMode === 'signup' && !result.data.session) {
    message.textContent = 'Account created. Check your email to confirm, then come back to log in.';
    return;
  }
  updateAccountUI(result.data.user);
  $('#auth-modal').close();
  $('#auth-form').reset();
  notify(authMode === 'signup' ? 'Welcome to the market!' : 'You are logged in.');
});
$('#listing-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#listing-message');
  message.classList.remove('error');
  if (!db || !currentUser) return;
  const listing = {
    seller_id: currentUser.id,
    title: $('#listing-name').value.trim(),
    category: $('#listing-category').value,
    description: $('#listing-description').value.trim(),
    price: Number($('#listing-price').value),
    business_name: $('#listing-business').value.trim(),
    status: 'active'
  };
  const { error } = await db.from('listings').insert(listing);
  if (error) {
    message.textContent = error.message;
    message.classList.add('error');
    return;
  }
  $('#listing-modal').close();
  $('#listing-form').reset();
  await loadListings();
  notify('Your listing is live. Thanks for being here!');
  $('#discover').scrollIntoView({ behavior: 'smooth' });
});
if (db) {
  db.auth.getSession().then(({ data }) => updateAccountUI(data.session?.user || null));
  db.auth.onAuthStateChange((_event, session) => updateAccountUI(session?.user || null));
}
