# The Local Market

A responsive, static marketplace starter for independent businesses. It includes a discover page with searchable, filterable sample listings, a responsive layout, and optional Supabase authentication and listing creation.

## Run locally

Open `index.html` in a browser, or serve this folder with a static web server. The page works as a UI demo without backend credentials and displays sample listings. Authentication and publishing require a Supabase project.

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In `app.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your project's URL and **publishable (anon) key**.
4. In Supabase Auth settings, configure the site URL and redirect URLs for your local development URL and deployed GitHub Pages URL.
5. Deploy the repository's root to GitHub Pages.

Only use a publishable/anon key in browser code. Never put a `service_role` or other secret key in this public repository. The database schema enables row-level security; review and adapt policies before launching with real users or sensitive information.

## Included

- `index.html` — marketplace page and sign-in / create listing dialogs
- `styles.css` — responsive visual design
- `app.js` — search, category filters, sample data, Supabase Auth and listing operations
- `supabase/schema.sql` — starter tables, profile bootstrap trigger, and row-level security policies

## Current scope

This is a starter, not a production commerce platform. It does not process payments, upload listing images, manage orders, or provide seller profiles yet. The heart/save buttons are UI-only. Add payment processing, moderation, storage, and operational policies before accepting real transactions.
