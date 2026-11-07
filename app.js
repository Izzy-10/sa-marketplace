const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';
const STORAGE_KEY = 'local-marketplace-listings-v1';

const sampleListings = [
  { id: 'demo-1', title: 'Sunday Morning Ceramic Mug', business_name: 'Juniper & Clay', category: 'Home & Living', description: 'Hand-thrown stoneware made for slow mornings and long conversations.', price: 32, location: 'Portland, OR', art: '☕', artIndex: 0 },
  { id: 'demo-2', title: 'The Everyday Tote', business_name: 'Good Form Studio', category: 'Art & Design', description: 'A sturdy, screen-printed everyday carry-all designed for city errands and weekend strolls.', price: 28, location: 'Brooklyn, NY', art: '👜', artIndex: 1 },
  { id: 'demo-3', title: 'Small Batch Citrus Honey', business_name: 'Bee Kind Pantry', category: 'Food & Drink', description: 'Raw wildflower honey with a bright citrus finish that feels like sunshine in a jar.', price: 16, location: 'Austin, TX', art: '🍯', artIndex: 2 },
  { id: 'demo-4', title: 'A Softer Sunday Candle', business_name: 'Little Light Co.', category: 'Home & Living', description: 'A slow-burning soy candle with gentle fig and cedar notes for an easy reset.', price: 24, location: 'Asheville, NC', art: '🕯️', artIndex: 3 },
  { id: 'demo-5', title: 'Herbal Reset Tea Blend', business_name: 'Tender Leaf Botanics', category: 'Wellness', description: 'A calming caffeine-free tea blend made to slow the day down and lighten the mind.', price: 19, location: 'Seattle, WA', art: '🍵', artIndex: 4 },
  { id: 'demo-6', title: 'Wildflower Print, No. 04', business_name: 'Marlow Paper House', category: 'Art & Design', description: 'An archival botanical print with soft watercolour color and a little room to dream.', price: 35, location: 'Hudson, NY', art: '🌼', artIndex: 5 },
  { id: 'demo-7', title: 'Market Day Granola', business_name: 'Sunday Sun Provisions', category: 'Food & Drink', description: 'Crunchy golden clusters with toasted pecans and a warming hint of cinnamon.', price: 14, location: 'Nashville, TN', art: '🥣', artIndex: 6 },
  { id: 'demo-8', title: 'Brand Story Session', business_name: 'Brightside Creative', category: 'Services', description: 'A focused 60-minute business session to clarify your voice, value, and next best move.', price: 85, location: 'Remote', art: '✍️', artIndex: 7 }
];

let listings = [];
let selectedCategory = 'All';
let searchTerm = '';
let authMode = 'signin';
let currentUser = null;
let toastTimer;

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const db = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (selector) => document.querySelector(selector);

function getStoredListings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {
    console.warn('Could not read local marketplace data:', error);
  }
  return [...sampleListings];
}

function persistListings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.warn('Could not save local marketplace data:', error);
  }
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
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

function renderHomeListings() {
  const grid = $('#listing-grid');
  if (!grid) return;
  const results = filteredListings();
  const resultsText = $('#results-count');
  if (resultsText) {
    resultsText.textContent = searchTerm || selectedCategory !== 'All' ? `${results.length} ${results.length === 1 ? 'find' : 'finds'} for you` : 'A few lovely finds';
  }
  const clearButton = $('#clear-search');
  if (clearButton) clearButton.classList.toggle('hidden', !searchTerm && selectedCategory === 'All');
  const emptyState = $('#empty-state');
  if (emptyState) emptyState.classList.toggle('hidden', results.length > 0);
  grid.classList.toggle('hidden', results.length === 0);
  grid.innerHTML = results.map((item, index) => {
    const art = item.art || ['✿', '☕', '🌿', '✳'][index % 4];
    const artIndex = Number.isInteger(item.artIndex) ? item.artIndex : index % 8;

    return `
      <article class="listing-card">
        <div class="listing-visual" data-art="${artIndex % 8}">
          <span class="art" aria-hidden="true">${escapeHTML(art)}</span>
          <span class="listing-badge">${escapeHTML(item.category || 'Independent')}</span>
          <button class="favorite-button" type="button" aria-label="Save ${escapeHTML(item.title)}" aria-pressed="false">♡</button>
        </div>
        <div class="listing-info">
          <p class="listing-business">${escapeHTML(item.business_name || 'Independent maker')}</p>
          <h3 class="listing-title"><a href="details.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3>
          <div class="listing-bottom"><span class="listing-price">${currency(item.price)}</span><span class="listing-location">${escapeHTML(item.location || 'Made with care')}</span></div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadListings() {
  if (db) {
    const { data, error } = await db.from('listings').select('id,title,business_name,category,description,price,location,status').eq('status', 'active').order('created_at', { ascending: false });
    if (error) {
      console.error('Could not load listings from Supabase:', error.message);
      listings = getStoredListings();
      renderHomeListings();
      notify('Showing demo listings while Supabase is not connected yet.');
      return;
    }
    listings = (data && data.length ? data : getStoredListings()).map((item, index) => ({
      ...item,
      artIndex: index % 8,
      art: ['☕', '👜', '🍯', '🕯️', '🍵', '🌼', '🥣', '✍️'][index % 8]
    }));
  } else {
    listings = getStoredListings();
  }
  if (typeof renderHomeListings === 'function') renderHomeListings();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderListingDetail === 'function') renderListingDetail();
  persistListings();
}

function updateAccountUI(user) {
  currentUser = user;
  const authButton = $('#auth-button');
  const accountButton = $('#account-button');
  if (authButton) authButton.classList.toggle('hidden', Boolean(user));
  if (accountButton) {
    accountButton.classList.toggle('hidden', !user);
    if (user) accountButton.textContent = (user.email || 'Y').slice(0, 1).toUpperCase();
  }
}

function showAuth(mode = 'signin') {
  setAuthMode(mode);
  const message = $('#auth-message');
  if (message) message.textContent = '';
  $('#auth-modal').showModal();
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('selected', tab.dataset.mode === mode));
  const authTitle = $('#auth-title');
  const authSubmit = $('#auth-submit');
  if (authTitle) authTitle.innerHTML = mode === 'signin' ? 'Welcome <em>in.</em>' : 'Join the <em>market.</em>';
  if (authSubmit) authSubmit.textContent = mode === 'signin' ? 'Log in' : 'Create account';
  const authPassword = $('#auth-password');
  if (authPassword) authPassword.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
}

function openListingForm() {
  if (!currentUser) {
    showAuth('signup');
    notify('Create an account to start selling.');
    return;
  }
  const listingMessage = $('#listing-message');
  if (listingMessage) listingMessage.textContent = '';
  $('#listing-modal').showModal();
}

function renderDashboard() {
  const dashboardList = $('#dashboard-list');
  if (!dashboardList) return;

  const rows = listings.slice(0, 6).map((item) => `
    <div class="dashboard-row">
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <span>${escapeHTML(item.business_name)} · ${escapeHTML(item.category)}</span>
      </div>
      <span class="dashboard-meta">${currency(item.price)}</span>
    </div>
  `).join('');

  dashboardList.innerHTML = rows || '<p class="empty-mini">No listings yet.</p>';
}

function renderListingDetail() {
  const detailWrap = $('#listing-detail');
  if (!detailWrap) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const listing = listings.find((item) => item.id === id) || sampleListings[0];

  if (!listing) {
    detailWrap.innerHTML = '<div class="info-panel"><h2>Listing not found</h2><p>The item you selected is no longer available.</p><a class="button button-dark" href="index.html">Back to market</a></div>';
    return;
  }

  detailWrap.innerHTML = `
    <div class="detail-hero">
      <div class="detail-art">${listing.art || '✳'}</div>
      <div class="detail-copy">
        <p class="eyebrow">${escapeHTML(listing.category || 'Independent')}</p>
        <h1>${escapeHTML(listing.title)}</h1>
        <p class="detail-business">by ${escapeHTML(listing.business_name)}</p>
        <p class="detail-price">${currency(listing.price)}</p>
        <p class="detail-text">${escapeHTML(listing.description)}</p>
        <div class="detail-actions">
          <button class="button button-dark" type="button">Contact seller</button>
          <button class="button button-outline" type="button">Save</button>
        </div>
        <ul class="detail-meta">
          <li><span>Location</span><strong>${escapeHTML(listing.location || 'Remote')}</strong></li>
          <li><span>Response time</span><strong>Usually within 24 hours</strong></li>
          <li><span>Care</span><strong>Made with intention</strong></li>
        </ul>
      </div>
    </div>
  `;
}

function initHomePage() {
  if (!document.body.dataset.page) return;

  $('#year').textContent = new Date().getFullYear();
  if ($('#search-input')) {
    $('#search-input').addEventListener('input', (event) => {
      searchTerm = event.target.value;
      renderHomeListings();
    });
    $('#search-input').addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.currentTarget.focus();
      }
    });
  }

  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      selectedCategory = chip.dataset.category;
      document.querySelectorAll('.category-chip').forEach((item) => item.classList.toggle('selected', item === chip));
      renderHomeListings();
    });
  });

  const clearButton = $('#clear-search');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      searchTerm = '';
      selectedCategory = 'All';
      const searchInput = $('#search-input');
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('.category-chip').forEach((item) => item.classList.toggle('selected', item.dataset.category === 'All'));
      renderHomeListings();
    });
  }

  $('#reset-filters')?.addEventListener('click', () => clearButton?.click());
  $('#sort-button')?.addEventListener('click', () => notify('Showing the latest finds first.'));
  $('#auth-button')?.addEventListener('click', () => showAuth('signin'));
  $('#sell-button')?.addEventListener('click', openListingForm);
  $('#banner-sell-button')?.addEventListener('click', openListingForm);

  $('#account-button')?.addEventListener('click', async () => {
    if (!db || !currentUser) return;
    const { error } = await db.auth.signOut();
    if (error) return notify(error.message);
    updateAccountUI(null);
    notify('You have been logged out.');
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.mode)));

  $('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = $('#auth-message');
    if (message) message.classList.remove('error');
    if (!db) {
      if (message) {
        message.textContent = 'Authentication is ready to connect. Add your Supabase URL and publishable key in app.js.';
        message.classList.add('error');
      }
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

  $('#listing-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = $('#listing-message');
    if (message) message.classList.remove('error');

    const listing = {
      id: `local-${Date.now()}`,
      title: $('#listing-name').value.trim(),
      category: $('#listing-category').value,
      description: $('#listing-description').value.trim(),
      price: Number($('#listing-price').value),
      business_name: $('#listing-business').value.trim(),
      location: 'Remote',
      art: ['☕', '👜', '🍯', '🕯️', '🍵', '🌼', '🥣', '✍️'][Math.floor(Math.random() * 8)],
      artIndex: Math.floor(Math.random() * 8)
    };

    if (!listing.title || !listing.category || !listing.description || !listing.business_name || !Number.isFinite(listing.price)) {
      if (message) {
        message.textContent = 'Please complete all fields before publishing.';
        message.classList.add('error');
      }
      return;
    }

    if (db && currentUser) {
      const { error } = await db.from('listings').insert({
        seller_id: currentUser.id,
        title: listing.title,
        category: listing.category,
        description: listing.description,
        price: listing.price,
        business_name: listing.business_name,
        location: listing.location,
        status: 'active'
      });
      if (error) {
        message.textContent = error.message;
        message.classList.add('error');
        return;
      }
    } else {
      listings.unshift(listing);
      persistListings();
    }

    $('#listing-modal').close();
    $('#listing-form').reset();
    if (typeof renderHomeListings === 'function') renderHomeListings();
    if (typeof renderDashboard === 'function') renderDashboard();
    notify('Your listing is live. Thanks for being here!');
  });

  document.addEventListener('click', (event) => {
    const favorite = event.target.closest('.favorite-button');
    if (!favorite) return;
    const active = favorite.getAttribute('aria-pressed') === 'true';
    favorite.setAttribute('aria-pressed', String(!active));
    favorite.textContent = !active ? '♥' : '♡';
    favorite.classList.toggle('is-favorite', !active);
  });
}

function initDashboardPage() {
  const addButton = $('#dashboard-open-form');
  if (addButton) addButton.addEventListener('click', openListingForm);
  const dashboardForm = $('#dashboard-form');
  if (dashboardForm) {
    dashboardForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const title = $('#dashboard-title').value.trim();
      const category = $('#dashboard-category').value;
      const business = $('#dashboard-business').value.trim();
      const price = Number($('#dashboard-price').value);
      const description = $('#dashboard-description').value.trim();

      const listing = {
        id: `local-${Date.now()}`,
        title,
        category,
        business_name: business,
        price,
        description,
        location: 'Remote',
        art: ['☕', '👜', '🍯', '🕯️', '🍵', '🌼', '🥣', '✍️'][Math.floor(Math.random() * 8)],
        artIndex: Math.floor(Math.random() * 8)
      };

      if (!title || !business || !category || !description || !Number.isFinite(price)) {
        notify('Please complete the form carefully.');
        return;
      }

      listings.unshift(listing);
      persistListings();
      renderDashboard();
      renderHomeListings();
      dashboardForm.reset();
      notify('Your listing has been added.');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  listings = getStoredListings();
  const page = document.body.dataset.page || 'home';
  if (page === 'dashboard') initDashboardPage();
  initHomePage();
  loadListings();

  if (db) {
    db.auth.getSession().then(({ data }) => updateAccountUI(data.session?.user || null));
    db.auth.onAuthStateChange((_event, session) => updateAccountUI(session?.user || null));
  } else {
    updateAccountUI(null);
  }
});
