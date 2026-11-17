# DocuReady

> Catch application-ending document errors before you submit.

DocuReady is an intelligent pre-submission application auditing platform designed to prevent administrative rejections in scholarships, admissions, and competitive applications. It extracts key fields from identity and academic documents, cross-references them for consistency, and identifies missing requirements or conflicting data. Applicants receive an actionable readiness report with prioritized corrective steps before final submission.

## Live Demo

[https://docu-ready-ten.vercel.app](https://docu-ready-ten.vercel.app)

## Key Features

- **Multi-Format Ingestion:** Supports PDF, PNG, and JPG uploads under standard size constraints.
- **Automated Text Extraction:** Uses local OCR and PDF stream parsing to extract names, dates of birth, and document metadata.
- **Human-in-the-Loop Review:** Allows users to review, edit, and confirm extracted values before verification runs.
- **Cross-Document Verification:** Detects name variations, date of birth discrepancies, and expired or stale certificates.
- **Category-Based Rule Checking:** Enforces mandatory document checklists tailored to specific application programs.
- **Privacy-First Data Purge:** Ephemeral file handling with one-click permanent session and document deletion.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, Multer
- **Document Processing:** Tesseract.js (OCR), pdf-parse

## Local Setup

```bash
# Clone the repository
git clone https://github.com/dhruv10-06/DocuReady.git
cd DocuReady

# Install dependencies
npm install
npm --prefix client install

# Run backend and frontend concurrently
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend API at `http://localhost:5000`. Automated tests run with `npm run test:all`.

## License

This project is licensed under the [MIT License](LICENSE).
