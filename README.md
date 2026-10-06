# Tenderdesk — Step 2

Browser-only tender package preparation built with React, TypeScript, Vite and PDF.js. No backend or upload endpoint. The sample pack is test data, not application code.

## Run

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Requirements imports validate all tender fields, real YYYY-MM-DD dates, non-empty requirements, bilingual titles, unique IDs and positive unique orders, and boolean mandatory/expiry fields. Import failures preserve the previous valid tender. PDFs are checked by extension, MIME when present, file signature and PDF.js parsing. Files that cannot be read stay visible with a removable error state and count toward limits. Up to 30 PDFs and 50 MiB total are accepted. Nothing is matched automatically.

Load sample reads the supplied JSON and discovers the bundled PDFs, then uses the same validation and page-count paths as user imports. Interface copy lives in `src/strings.ts`; English is the only implemented locale. Bangla titles are preserved for a future translation step.

Step 2 adds editable one-to-one PDF assignments, Unmatch and Undo last match change. Replacement resets the expiry date; undo restores the previous match and its date without changing other rows. Removing a file clears its match and undo history. Importing a new requirements file clears assignments and expiry values while retaining uploaded files; Load sample resets both.

The browser computes SHA-256 over each file's bytes. All identical copies are marked, and at most one file from each identical group may be assigned. Unreadable or pending files cannot be assigned. Optional documents with a match follow the same expiry rules as mandatory documents, including acceptance on the submission deadline. Each requirement displays exactly one status and any blocking reason. Readiness counts distinguish OK, skipped optional requirements, and blocking issues. Upload problems and duplicate copies are reported separately; unassigned files are not package content.

Step 3 still needs combined PDF generation. Generate remains disabled even when the checklist is ready. All processing remains local to the browser.
