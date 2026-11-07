# The Local Market — Supabase MVP

A static marketplace for entrepreneurs and independent businesses, backed by Supabase Auth, Postgres, Row Level Security, and Storage.

## Features

- Browse live listings, search, and filter by category
- Email/password sign-up and login with Supabase Auth
- Seller business profile editing
- Create, archive/publish, and delete your own listings
- Optional listing image uploads to a public Supabase Storage bucket
- Customer-to-seller inquiries stored privately in Supabase
- RLS policies for profiles, listings, inquiries, and listing images
- Demo listing data remains available before Supabase is configured

## Setup

1. Create a Supabase project.
2. Open the SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). If upgrading the previous starter, take a database backup first; this script preserves existing listings and removes the old profile email column because contact emails should not be public.
3. In `app.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` using your project URL and browser-safe **publishable/anon key**.
4. In Supabase Authentication settings, enable email/password and configure Site URL plus Redirect URLs for local development and the GitHub Pages site.
5. Serve or deploy the repository as a static site. Start at `index.html`; sellers use `dashboard.html`.

Never place a Supabase `service_role` or secret key in this public repository. The publishable/anon key is intended for browser use only because database access is guarded by RLS. Review policies and validate the deployment settings before launch.

## Notes and limits

- The marketplace uses USD for display; change the currency helper in `app.js` for your market.
- Inquiries are stored in the database; this starter does not send email notifications or expose buyer email addresses to sellers.
- There is no checkout or payment processing. Add a trusted payment provider and server-side/Edge Function flow before taking payments; do not treat a client-side action as proof of payment.
- Public listing images are readable by anyone. Upload limits and allowed image MIME types are enforced by the bucket; the app limits images to 5 MB.
- The seller dashboard is a simple MVP, not a complete commerce/admin system. Add moderation, abuse controls, backups, and monitoring before production.
