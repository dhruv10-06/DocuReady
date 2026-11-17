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
 * Draws a realistic 2D QR matrix pattern with position detection squares
 */
function drawQrPattern(ctx, x, y, size) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  // Position detection markers in 3 corners
  const markerSize = Math.floor(size * 0.22);
  function drawMarker(mx, my) {
    ctx.fillRect(mx, my, markerSize, markerSize);
    ctx.clearRect(mx + 4, my + 4, markerSize - 8, markerSize - 8);
    ctx.fillRect(mx + 8, my + 8, markerSize - 16, markerSize - 16);
  }
  drawMarker(x + 4, y + 4);
  drawMarker(x + size - markerSize - 4, y + 4);
  drawMarker(x + 4, y + size - markerSize - 4);

  // Deterministic QR modules
  const cellSize = Math.floor(size / 21);
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)) continue;
      if ((r * 7 + c * 13 + 3) % 5 === 0 || (r * 11 + c * 3) % 7 === 0) {
        ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
}

/**
 * Draws an applicant photo placeholder silhouette
 */
function drawPortraitSilhouette(ctx, x, y, w, h) {
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Head
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.38, w * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Torso / shoulders
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.85, w * 0.38, h * 0.28, 0, Math.PI, 0, false);
  ctx.fill();

  // Photo badge
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x, y + h - 24, w, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('APPLICANT PHOTO', x + w / 2, y + h - 8);
  ctx.textAlign = 'left';
}

/**
 * Draws an official department / board seal stamp graphic
 */
function drawOfficialSeal(ctx, centerX, centerY, radius, orgTitle, locTitle) {
  ctx.save();
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL', centerX, centerY - 6);
  ctx.fillText('SEAL', centerX, centerY + 10);
  ctx.font = '10px sans-serif';
  ctx.fillText(orgTitle, centerX, centerY - radius + 20);
  ctx.fillText(locTitle, centerX, centerY + radius - 14);
  ctx.restore();
}

/**
 * Generates an authentic synthetic Aadhaar card bitmap (PNG or JPEG)
 */
function generateAadhaarImage(format = 'png') {
  if (!createCanvas) return null;
  const width = 1200;
  const height = 750;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer card framing
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 4;
  ctx.strokeRect(15, 15, width - 30, height - 30);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // Top tricolor accent strip
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(25, 25, width - 50, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(25, 33, width - 50, 4);
  ctx.fillStyle = '#138808';
  ctx.fillRect(25, 37, width - 50, 8);

  // Header titles
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GOVERNMENT OF INDIA', width / 2, 78);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('UNIQUE IDENTIFICATION AUTHORITY OF INDIA', width / 2, 108);
  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('AADHAAR - MERA AADHAAR, MERI PEHCHAN', width / 2, 134);
  ctx.textAlign = 'left';

  // Divider line
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(35, 150);
  ctx.lineTo(width - 35, 150);
  ctx.stroke();

  // Photo box
  drawPortraitSilhouette(ctx, 50, 175, 180, 230);

  // QR Code box
  drawQrPattern(ctx, width - 230, 175, 180);
  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECURE DIGITAL QR', width - 140, 375);
  ctx.textAlign = 'left';

  // Personal details
  const startX = 260;
  let curY = 200;
  const lineGap = 36;

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Candidate Name: Rahul Sharma', startX, curY);

  curY += lineGap;
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText("Father's Name: Suresh Sharma", startX, curY);

  curY += lineGap;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Date of Birth: 12/05/2005', startX, curY);

  curY += lineGap;
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Gender: MALE', startX, curY);

  curY += lineGap;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Aadhaar No: 9876-5432-9912', startX, curY);

  curY += lineGap;
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Address: H.No 42, Green Park Extension, New Delhi - 110016', startX, curY);

  curY += lineGap;
  ctx.fillText('Date of Issue: 10/01/2021', startX, curY);

  // Divider above Aadhaar Number
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, 445);
  ctx.lineTo(width - 35, 445);
  ctx.stroke();

  // Aadhaar Number Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(45, 460, width - 90, 110);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(45, 460, width - 90, 110);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOUR AADHAAR NUMBER / आधार क्रमांक', width / 2, 488);

  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('9876-5432-9912', width / 2, 538);
  ctx.textAlign = 'left';

  // Status and details
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Status: ACTIVE / VERIFIED   |   VID: 9102-4821-3301-8821   |   Toll Free: 1947', width / 2, 605);

  // Disclaimer footer banner
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(25, 665, width - 50, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]', width / 2, 695);

  const mime = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
  return canvas.toBuffer(mime);
}

/**
 * Generates an authentic synthetic Class XII Marksheet bitmap (PNG or JPEG)
 */
function generateMarksheetImage(format = 'png') {
  if (!createCanvas) return null;
  const width = 1000;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Framing
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Board Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CENTRAL BOARD OF SECONDARY EDUCATION, DELHI', width / 2, 80);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('SENIOR SCHOOL CERTIFICATE EXAMINATION 2023', width / 2, 115);

  // Sub-header badge
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(width / 2 - 220, 135, 440, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('MARKS STATEMENT & PASS CERTIFICATE', width / 2, 159);
  ctx.textAlign = 'left';

  // Candidate Particulars Card
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(50, 195, width - 100, 240);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(50, 195, width - 100, 240);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Candidate Name: Rahul S. Sharma', 75, 235);
  ctx.fillText('Roll Number: CBSE-2023-884120', 530, 235);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText("Father's Name: Suresh Sharma", 75, 280);
  ctx.fillText("Mother's Name: Sunita Sharma", 530, 280);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Date of Birth: 12/05/2005', 75, 325);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('School: Delhi Public School, R.K. Puram, New Delhi', 75, 370);
  ctx.fillText('Date of Issue: 22/05/2023', 75, 415);

  // Marks Table
  const tableY = 460;
  const colWidths = [120, 320, 110, 110, 110, 130];
  const colX = [50];
  for (let i = 0; i < colWidths.length; i++) {
    colX.push(colX[i] + colWidths[i]);
  }

  // Header Row
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(50, tableY, width - 100, 45);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SUB CODE', colX[0] + 15, tableY + 28);
  ctx.fillText('SUBJECT NAME', colX[1] + 15, tableY + 28);
  ctx.fillText('THEORY', colX[2] + 15, tableY + 28);
  ctx.fillText('PRACTICAL', colX[3] + 15, tableY + 28);
  ctx.fillText('TOTAL', colX[4] + 15, tableY + 28);
  ctx.fillText('GRADE', colX[5] + 15, tableY + 28);

  // Subject rows
  const subjects = [
    { code: '301', name: 'ENGLISH CORE', th: '078', pr: '018', tot: '096', gr: 'A1' },
    { code: '041', name: 'MATHEMATICS', th: '072', pr: '018', tot: '090', gr: 'A2' },
    { code: '042', name: 'PHYSICS', th: '065', pr: '028', tot: '093', gr: 'A1' },
    { code: '043', name: 'CHEMISTRY', th: '062', pr: '027', tot: '089', gr: 'B1' },
    { code: '083', name: 'COMPUTER SCIENCE', th: '068', pr: '029', tot: '097', gr: 'A1' },
  ];

  let rY = tableY + 45;
  ctx.font = '16px sans-serif';
  for (let i = 0; i < subjects.length; i++) {
    const s = subjects[i];
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(50, rY, width - 100, 48);

    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(50, rY, width - 100, 48);

    ctx.fillStyle = '#0f172a';
    ctx.fillText(s.code, colX[0] + 25, rY + 30);
    ctx.fillText(s.name, colX[1] + 15, rY + 30);
    ctx.fillText(s.th, colX[2] + 25, rY + 30);
    ctx.fillText(s.pr, colX[3] + 25, rY + 30);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(s.tot, colX[4] + 25, rY + 30);
    ctx.fillStyle = '#0284c7';
    ctx.fillText(s.gr, colX[5] + 25, rY + 30);
    ctx.font = '16px sans-serif';

    rY += 48;
  }

  // Results Summary Box
  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(50, rY + 15, width - 100, 110);
  ctx.strokeStyle = '#86efac';
  ctx.strokeRect(50, rY + 15, width - 100, 110);

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Result: PASS', 80, rY + 60);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Overall Percentage: 88.4%', 350, rY + 60);
  ctx.font = '18px sans-serif';
  ctx.fillText('Total Marks: 465 / 500  (Distinction in 4 subjects)', 80, rY + 100);

  // Seals and signatures
  drawOfficialSeal(ctx, 200, rY + 220, 55, 'CBSE DELHI', 'EXAM DEPT');

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Dr. Sanyam Bhardwaj', width - 200, rY + 210);
  ctx.font = '14px sans-serif';
  ctx.fillText('Controller of Examinations', width - 200, rY + 235);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width - 320, rY + 190);
  ctx.lineTo(width - 80, rY + 190);
  ctx.stroke();

  // Bottom Banner
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(28, height - 70, width - 56, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]', width / 2, height - 44);

  const mime = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
  return canvas.toBuffer(mime);
}

/**
 * Generates an authentic synthetic Annual Income Certificate bitmap (JPEG or PNG)
 */
function generateIncomeImage(format = 'jpeg') {
  if (!createCanvas) return null;
  const width = 1000;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Framing
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REVENUE DEPARTMENT, GOVT. OF NCT OF DELHI', width / 2, 75);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('OFFICE OF THE TAHSILDAR / REVENUE OFFICER', width / 2, 108);

  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(width / 2 - 250, 130, 500, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ANNUAL FAMILY INCOME CERTIFICATE', width / 2, 156);
  ctx.textAlign = 'left';

  // Metadata Strip
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(50, 190, width - 100, 75);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(50, 190, width - 100, 75);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Certificate No: REV/INC/2023/4491', 75, 235);
  ctx.fillText('Date of Issue: 14/08/2023', 440, 235);
  ctx.fillText('Valid Till: 13/08/2024', 720, 235);

  // Legal Statement
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('This is to certify that based on the inquiry report of the Area Revenue Inspector and', 70, 310);
  ctx.fillText('local verification, the annual income of the family detailed below is verified as true:', 70, 340);

  // Details Table Box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(50, 375, width - 100, 380);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(50, 375, width - 100, 380);

  let curY = 425;
  const lineGap = 48;

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Candidate Name: Rahul Sharma', 80, curY);

  curY += lineGap;
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText("Father's Name: Suresh Sharma", 80, curY);

  curY += lineGap;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Date of Birth: 12/05/2004', 80, curY);

  curY += lineGap;
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Residential Address: H.No 42, Green Park Extension, New Delhi - 110016', 80, curY);

  curY += lineGap;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#1e40af';
  ctx.fillText('Total Annual Family Income: INR 1,80,000/-', 80, curY);

  curY += 36;
  ctx.font = 'italic 16px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('(Rupees One Lakh Eighty Thousand Only)', 80, curY);

  curY += 46;
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Purpose: Higher Education Financial Scholarship', 80, curY);

  // Authority Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(50, 785, width - 100, 100);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(50, 785, width - 100, 100);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Issuing Authority: Office of the Tahsildar, District South, New Delhi', 75, 842);

  // Official Seal and Signature
  drawOfficialSeal(ctx, 220, 1020, 60, 'REVENUE DEPT', 'DIST SOUTH');

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('S.K. Mishra (Executive Magistrate)', width - 250, 1000);
  ctx.font = '16px sans-serif';
  ctx.fillText('Office of the Tahsildar, District South', width - 250, 1030);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Digitally Signed | Hash: 8b21a-4491-delhi', width - 250, 1060);
  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(width - 390, 980);
  ctx.lineTo(width - 110, 980);
  ctx.stroke();

  // Bottom Banner
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(28, height - 70, width - 56, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('[SYNTHETIC DEMO DOCUMENT FOR EVALUATION PURPOSES ONLY]', width / 2, height - 44);

  const mime = (format === 'jpeg' || format === 'jpg') ? 'image/jpeg' : 'image/png';
  return canvas.toBuffer(mime);
}

/**
 * Legacy line-based image generator fallback
 */
function createImageFromLines(lines, format = 'png') {
  if (!createCanvas) return null;
  const width = 1000;
  const height = Math.max(700, lines.length * 42 + 120);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

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
 * Ensures sample directory exists and writes sample files in PDF, PNG and JPEG formats
 */
function ensureSampleFiles() {
  const sampleDir = path.join(__dirname, '..', 'public', 'sample-docs');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }

  // 1. Identity Proof (Aadhaar Card) - Preserved PDF Lines
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

  // High-fidelity PNG and JPG versions
  const aadhaarPng = generateAadhaarImage('png');
  if (aadhaarPng) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Aadhaar_Rahul_Sharma.png'), aadhaarPng);
  }
  const aadhaarJpg = generateAadhaarImage('jpeg');
  if (aadhaarJpg) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Aadhaar_Rahul_Sharma.jpg'), aadhaarJpg);
  }

  // 2. Marksheet (Class XII) - Preserved PDF Lines
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

  // High-fidelity PNG and JPG versions for Marksheet (previously missing!)
  const marksheetPng = generateMarksheetImage('png');
  if (marksheetPng) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Class_XII_Marksheet_Rahul.png'), marksheetPng);
  }
  const marksheetJpg = generateMarksheetImage('jpeg');
  if (marksheetJpg) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Class_XII_Marksheet_Rahul.jpg'), marksheetJpg);
  }

  // 3. Income Certificate (With intentional DOB discrepancy & older issue date) - Preserved PDF Lines
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

  // High-fidelity JPG and PNG versions
  const incomeJpg = generateIncomeImage('jpeg');
  if (incomeJpg) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Income_Certificate_Rahul.jpg'), incomeJpg);
  }
  const incomePng = generateIncomeImage('png');
  if (incomePng) {
    fs.writeFileSync(path.join(sampleDir, 'Synthetic_Income_Certificate_Rahul.png'), incomePng);
  }

  console.log('Sample synthetic documents generated successfully at:', sampleDir);
}

module.exports = {
  createPdfFromLines,
  createImageFromLines,
  generateAadhaarImage,
  generateMarksheetImage,
  generateIncomeImage,
  ensureSampleFiles,
};
