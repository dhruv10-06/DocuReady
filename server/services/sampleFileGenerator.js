// server/services/sampleFileGenerator.js

const fs = require('fs');
const path = require('path');

let createCanvas = null;
try {
  const canvasPkg = require('@napi-rs/canvas');
  createCanvas = canvasPkg.createCanvas;
} catch (e) {
  // Graceful fallback if @napi-rs/canvas is unavailable
}

/**
 * Creates a compliant standard PDF buffer with embedded text lines
 */
function createPdfFromLines(lines) {
  let contentStream = 'BT\n/F1 12 Tf\n20 TL\n50 740 Td\n';
  
  for (const line of lines) {
    const escaped = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    contentStream += `(${escaped}) Tj T*\n`;
  }
  contentStream += 'ET\n';

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  // Build objects
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const header = '%PDF-1.4\n';
  const offset1 = Buffer.byteLength(header, 'utf8');
  const offset2 = offset1 + Buffer.byteLength(obj1, 'utf8');
  const offset3 = offset2 + Buffer.byteLength(obj2, 'utf8');
  const offset4 = offset3 + Buffer.byteLength(obj3, 'utf8');
  const offset5 = offset4 + Buffer.byteLength(obj4, 'utf8');

  const xrefOffset = offset5 + Buffer.byteLength(obj5, 'utf8');

  function padOffset(num) {
    return String(num).padStart(10, '0');
  }

  const xref = 
`xref
0 6
0000000000 65535 f 
${padOffset(offset1)} 00000 n 
${padOffset(offset2)} 00000 n 
${padOffset(offset3)} 00000 n 
${padOffset(offset4)} 00000 n 
${padOffset(offset5)} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF\n`;

  const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref;
  return Buffer.from(fullPdf, 'utf8');
}

/**
 * Creates a high-clarity bitmap image buffer (PNG or JPEG) with clean typography for OCR testing
 */
function createImageFromLines(lines, format = 'png') {
  if (!createCanvas) return null;
  const width = 1000;
  const height = Math.max(700, lines.length * 42 + 120);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer framing
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  let y = 80;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i < 3) {
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#1e3a8a';
    } else if (
      line.startsWith('Candidate Name') ||
      line.startsWith('Date of Birth') ||
      line.startsWith('Roll Number') ||
      line.startsWith('Certificate No') ||
      line.startsWith('Aadhaar Number')
    ) {
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#0f172a';
    } else if (line.startsWith('---') || line.startsWith('[')) {
      ctx.font = '16px monospace';
      ctx.fillStyle = '#64748b';
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#1e293b';
    }

    ctx.fillText(line, 60, y);
    y += 38;
  }

  const mime = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
  return canvas.toBuffer(mime);
}

/**
 * Ensures sample directory exists and writes sample files
 */
function ensureSampleFiles() {
  const sampleDir = path.join(__dirname, '..', 'public', 'sample-docs');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }

  // 1. Identity Proof (Aadhaar Card)
  const aadhaarLines = [
    'GOVERNMENT OF INDIA',
    'UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
    'AADHAAR - MERA AADHAAR, MERI PEHCHAN',
    '-------------------------------------------------------',
    'Candidate Name: Rahul Sharma',
    "Father's Name: Suresh Sharma",
    'Date of Birth: 12/05/2005',
    'Gender: MALE',
    'Aadhaar Number: 9876-5432-9912',
    'Address: H.No 42, Green Park Extension, New Delhi - 110016',
    'Date of Issue: 10/01/2021',
    'Status: ACTIVE / VERIFIED',
    '-------------------------------------------------------',
    '[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]',
  ];
  fs.writeFileSync(path.join(sampleDir, 'Synthetic_Aadhaar_Rahul_Sharma.pdf'), createPdfFromLines(aadhaarLines));
  const aadhaarPng = createImageFromLines(aadhaarLines, 'png');
  if (aadhaarPng) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Aadhaar_Rahul_Sharma.png'), aadhaarPng);
  }

  // 2. Marksheet (Class XII)
  const marksheetLines = [
    'CENTRAL BOARD OF SECONDARY EDUCATION, DELHI',
    'SENIOR SCHOOL CERTIFICATE EXAMINATION 2023',
    'MARKS STATEMENT & PASS CERTIFICATE',
    '-------------------------------------------------------',
    'Candidate Name: Rahul S. Sharma',
    "Father's Name: Suresh Sharma",
    "Mother's Name: Sunita Sharma",
    'Roll Number: CBSE-2023-884120',
    'Date of Birth: 12/05/2005',
    'School: Delhi Public School, R.K. Puram, New Delhi',
    'Result: PASS',
    'Overall Percentage: 88.4%',
    'Date of Issue: 22/05/2023',
    '-------------------------------------------------------',
    '[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]',
  ];
  fs.writeFileSync(path.join(sampleDir, 'Synthetic_Class_XII_Marksheet_Rahul.pdf'), createPdfFromLines(marksheetLines));

  // 3. Income Certificate (With intentional DOB discrepancy & older issue date)
  const incomeLines = [
    'OFFICE OF THE TAHSILDAR / REVENUE OFFICER',
    'REVENUE DEPARTMENT, GOVT. OF NCT OF DELHI',
    'ANNUAL FAMILY INCOME CERTIFICATE',
    '-------------------------------------------------------',
    'Certificate No: REV/INC/2023/4491',
    'Date of Issue: 14/08/2023',
    'Valid Till: 13/08/2024',
    '',
    'This is to certify that:',
    'Candidate Name: Rahul Sharma',
    "Father's Name: Suresh Sharma",
    'Date of Birth: 12/05/2004',
    'Total Annual Family Income: INR 1,80,000/-',
    'Purpose: Higher Education Financial Scholarship',
    'Issuing Authority: Office of the Tahsildar, District South, New Delhi',
    '-------------------------------------------------------',
    '[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]',
  ];
  fs.writeFileSync(path.join(sampleDir, 'Synthetic_Income_Certificate_Rahul.pdf'), createPdfFromLines(incomeLines));
  const incomeJpg = createImageFromLines(incomeLines, 'jpeg');
  if (incomeJpg) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Income_Certificate_Rahul.jpg'), incomeJpg);
  }

  console.log('Sample synthetic documents generated successfully at:', sampleDir);
}

module.exports = {
  createPdfFromLines,
  createImageFromLines,
  ensureSampleFiles,
};

