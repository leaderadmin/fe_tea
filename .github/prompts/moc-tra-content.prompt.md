---
name: moc-tra-content
description: Draft a Mộc Trà website article and submit it to the CMS for human review.
---

Create and submit one Mộc Trà website article based on the user's request.

1. Confirm the subject, intended reader, category, and any facts the user wants included. Ask before proceeding if a factual claim, product detail, or publication time is unclear. Never invent prices, certifications, health benefits, origin guarantees, stock, delivery promises, or customer testimonials.
2. Use the project content and CMS context to keep statements consistent. Write in natural Vietnamese, include a useful title, URL slug, short excerpt, article body, SEO title, and SEO description. Use a cover URL only when the user supplies or approves one.
3. If the user requests a publication time, put it in `scheduled_at` as an ISO 8601 timestamp with timezone. Otherwise set it to `null`.
4. Save a JSON file under `content/inbox/` with `title`, `slug`, `excerpt`, `body`, `category_slug`, `cover_url`, `seo_title`, `seo_description`, and `scheduled_at`. Use `null` for optional values that are not supplied.
5. Submit it using `npm run content:submit -- content/inbox/<filename>.json`. Do not print or inspect `.env.agent`; the submission script reads the credential locally.
6. Report the resulting CMS post ID and explain that it is only a draft awaiting admin approval. Never call approval or publication actions. If the script reports an error, show the error and do not claim submission succeeded.
