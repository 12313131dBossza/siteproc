# Smoke Test Checklist

- Vercel project imported; env vars set (Supabase, SendGrid, APP_BASE_URL).
- Supabase storage buckets:
	- `public` (public read policy) for PDFs.
	- `private` (no public read) for photos and signatures; app uses signed URLs.
- Run `sql/schema.sql` then `sql/rls.sql` in Supabase SQL editor.
- Seed: create company, user, job, suppliers.
- RFQ: create and send; submit 2 quotes via public link.
- Select winner; confirm PO PDF URL on PO record.
- Delivery: submit with photos offline; reconnect and confirm auto-flush.
- Change Order: create and approve via public link.
- Export: job CSVs download.
