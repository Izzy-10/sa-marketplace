# The Local Market MVP

A starter marketplace for entrepreneurs, creators, and independent businesses.

## What is included

- landing page with hero and marketplace browsing experience
- search and category filtering
- product cards linked to detail pages
- seller dashboard with a simple listing form
- local demo data for a realistic MVP flow
- optional Supabase integration for auth and listings

## Start locally

1. Open `index.html` in a browser, or serve the folder with a local static server.
2. The marketplace will work as a demo immediately with sample listings.
3. To connect Supabase, update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `app.js` and run the SQL from `supabase/schema.sql` in the Supabase SQL editor.

## Pages

- `index.html` — marketplace home page
- `details.html` — product detail page
- `dashboard.html` — seller dashboard and listing management

## Demo data

The app stores demo listings in browser local storage so you can add, filter, and browse them without a database.

## Next steps for the real MVP

- connect real auth and listings to Supabase
- add product images and uploads
- add cart or inquiry flows
- add profile creation and business details
- add bookings or checkout
- add review and moderation flows
