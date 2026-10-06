# Tender Package Builder

Frontend-only, bilingual (English / Bangla) web app that turns a set of PDF files into one checked, correctly ordered tender package PDF with a cover page and `<tender_id> | Page X of Y` footers.

- **Name:** Shreya Golder
- **Registration number:** `<fill in>`
- **Live site (HTTPS):** `<fill in after deploy>`

## How to run
No build step. Open `index.html` in Chrome (needs internet once to load pdf-lib from cdnjs), or serve the folder:

```
npx serve .
```

Deploy by pushing to GitHub and enabling GitHub Pages, or drag the folder into Netlify / Cloudflare Pages.

## Main features done
- Load `requirements.json`, show tender details and requirements sorted by `order`
- Upload many PDFs (page count shown, non-PDF rejected, remove any file)
- Match one file to one document (change or clear any time)
- Expiry dates and live status: Missing, Expiry date needed, Expired, Not provided, OK (expiry on the deadline day is OK)
- Duplicate detection by SHA-256 content hash; duplicates cannot be matched to different documents
- Generate button disabled with reasons while anything blocks
- Package PDF: English cover (tender ID, title, entity, bidder, deadline, package date, ordered document list), documents in order with all pages, footer on every page in its own band so it never covers content
- Download as `<tender_id>_Package.pdf`
- Full Bangla / English switch

## Bonus features
- Damaged or password-protected PDFs show a clear message instead of crashing
- Page numbers listed on the cover for each document

## Known problems
- Pages with a `/Rotate` value may appear unrotated in the package
- Bangla text is not drawn on the PDF cover (the cover is English as required)
- Needs internet to load pdf-lib from the CDN

## AI tools used
Claude (Anthropic)

## Most useful prompt
`<paste your best prompt here>`

## License
MIT
