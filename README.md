# Tenderdesk — Tender Document Package Builder

Browser-only tender document package preparation web application built with React 19, TypeScript, Vite, and PDF-lib. Fully client-side with zero backend dependencies or network uploads: all document verification, SHA-256 fingerprinting, page counting, and PDF assembly occur locally in the user's browser.

- **Author**: Shreya Golder
- **Registration**: 251-15-467
- **Repository**: [https://github.com/Shreyalien/DEVFEST-SHREYA.git](https://github.com/Shreyalien/DEVFEST-SHREYA.git)
- **Live Deployment**: [https://tenderdesk-two.vercel.app/](https://tenderdesk-two.vercel.app/)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Run

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

The application runs locally on `http://127.0.0.1:5173`.

### Build & Verification

```sh
# Type-check TypeScript codebase
npm run typecheck

# Build optimized production bundle
npm run build

# Run end-to-end Playwright test suite
npx playwright test
```

---

## Complete Workflow (Import → Match & Check → Generate)

1. **Step 1: Tender Import**
   - Click **Import requirements** to load any tender `requirements.json` via file picker, or click **Load sample** to explore with the provided contest sample pack.
   - Parses and strictly validates tender metadata (`tender_id`, `title`, `procuring_entity`, `bidder`, `submission_deadline`) and all requirements in submission order. Invalid formats show clear error messages without discarding existing valid state.
   - Upload multiple PDF documents up to **30 files** and **50 MB** total limit. Non-PDFs are rejected immediately. Actual page counts and SHA-256 content hashes are calculated in-browser.

2. **Step 2: Match & Verify**
   - **One-to-one document matching**: Assign uploaded files to requirements. Selecting a document prevents it from being chosen elsewhere.
   - **Byte-level Duplicate Prevention**: SHA-256 fingerprints detect identical copies even with different filenames. Identical copies are flagged and prevented from satisfying different requirements.
   - **Expiry Date Management**: Collects expiry dates for matched requirements flagged with `has_expiry` (both mandatory and optional). Expiry date equal to the submission deadline is accepted as valid.
   - **Checklist Statuses**:
     - `Missing`: Mandatory requirement without a file (blocks generation).
     - `Not provided`: Optional requirement without a file (does not block).
     - `Expiry date needed`: Matched requirement requiring an expiry date that has not been entered (blocks generation).
     - `Expired`: Document expiry date is strictly earlier than submission deadline (blocks generation).
     - `OK`: Satisfied requirement with valid expiry if required (does not block).
   - **Reversible Actions**: Full **Undo** button restores previous assignments and expiry dates. File removal cleanly removes all associated bindings without stale references.

3. **Step 3: Generate & Download Package**
   - When all mandatory requirements are satisfied, valid, and free of blockers, the **Generate package** button activates.
   - Generates `<tender_id>_Package.pdf` entirely in the browser:
     - **Cover Page**: Standard English cover sheet detailing tender metadata, creation date, and included documents schedule in requirement order.
     - **Source Document Assembly**: Appends all pages of matched PDFs in requirement order. Preserves orientation, annotations, and dimensions.
     - **Continuous Footers**: Centered bottom footer `"<tender_id> | Page X of Y"` across all pages including the cover, styled without overlapping source content.
   - Automatic browser download trigger and persistent manual download button.
   - Any modification to inputs immediately invalidates generated results and prevents stale downloads.

4. **Step 4: English & Bangla Localization**
   - Full bilingual interface toggle between English and বাংলা.
   - Supports native Bangla requirement titles (`title_bn`) while maintaining an English cover page as required by procurement standards.
   - User workflow, matches, and expiry state are fully preserved across language switches.

---

## Key Features & Browser-Only Security

- **Strict Privacy**: Uploaded PDFs and requirements files are never transferred to a server, cloud service, or database.
- **Robust Error Handling**: Gracefully identifies password-protected (encrypted) or corrupt PDFs without crashing.
- **Responsive Layout**: Designed for desktop, tablet, and narrow mobile viewports (down to 320px) without horizontal clipping.
- **Deliverables**:
  - Sample generated package: `output/T-2026-0417_Package.pdf` (16 total pages).
  - Screenshots: `screenshots/` directory showcasing document statuses and application views.

---

## AI Tools & Contest Prompts

- **AI Tools Used**: Google Antigravity Coding Assistant (Claude 3.5 Sonnet / Claude 3.7 Sonnet).
- **Most Useful Prompt**:
  > *"Implement Step 3 of Tender Document Package Builder: generate combined PDF package using pdf-lib with formal English cover page, dynamic page counts, and custom bottom footers matching Section 6 requirements."*
