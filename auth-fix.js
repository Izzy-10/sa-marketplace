/* Auth form reliability patch.
 * This intentionally uses only the Supabase publishable key. Never add a secret/service-role key here.
 */
(() => {
  const AUTH_SUPABASE_URL = 'https://oyoisymkncgkfzxabaas.supabase.co';
  const AUTH_PUBLISHABLE_KEY = 'sb_publishable_zq0FRp9CHeLay3zw6e3B7g_lQxe3YnA';
  const client = window.supabase?.createClient(AUTH_SUPABASE_URL, AUTH_PUBLISHABLE_KEY);
  if (!client) {
    console.error('Supabase Auth could not initialize. Check that the Supabase JS CDN loaded.');
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;

  // Capture before the existing app handler so auth errors are shown to the user,
  // including fetch/network exceptions that previously escaped the submit handler.
  document.addEventListener('submit', async (event) => {
    if (event.target?.id !== 'auth-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.target;
    const button = $('#auth-submit');
    const message = $('#auth-message');
    const signupTab = document.querySelector('.auth-tab.selected[data-mode="signup"]');
    const mode = signupTab ? 'signup' : 'signin';
    const email = $('#auth-email')?.value.trim();
    const password = $('#auth-password')?.value;

    if (!email || !password) {
      if (message) { message.textContent = 'Enter your email and password.'; message.classList.add('error'); }
      return;
    }

    if (button) { button.disabled = true; button.textContent = mode === 'signup' ? 'Creating account…' : 'Logging in…'; }
    if (message) { message.textContent = ''; message.classList.remove('error'); }

    try {
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } })
        : await client.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (mode === 'signup' && !result.data.session) {
        if (message) message.textContent = 'Account created. Check your email and click the confirmation link, then return here to log in.';
        return;
      }

      if (message) message.textContent = 'Success — opening your account…';
      $('#auth-modal')?.close();
      // Reload lets the main app read the newly persisted Supabase session on every page.
      window.location.assign(window.location.pathname);
    } catch (error) {
      console.error('Supabase authentication failed:', error);
      if (message) {
        message.textContent = error?.message || 'Could not connect to Supabase. Check your internet connection and try again.';
        message.classList.add('error');
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = mode === 'signup' ? 'Create account' : 'Log in';
      }
    }
  }, true);
})();
