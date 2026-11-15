// server/data/sampleData.js
/**
 * Synthetic demonstration documents for testing DocuReady audit workflow.
 * IMPORTANT: Clearly labeled as synthetic demonstration data for evaluation.
 */

const SYNTHETIC_DEMO_CASES = {
  RAHUL_SHARMA: {
    applicantName: 'Rahul Sharma',
    category: 'SCHOLARSHIP',
    notes: 'Synthetic benchmark scenario designed to test name variation, DOB mismatch, and missing document detection.',
    documents: [
      {
        id: 'doc-demo-aadhaar',
        filename: 'Synthetic_Aadhaar_Rahul_Sharma.png',
        mimeType: 'image/png',
        size: 142050,
        docCategory: 'IDENTITY_PROOF',
        isSynthetic: true,
        rawText: `
GOVERNMENT OF INDIA
UNIQUE IDENTIFICATION AUTHORITY OF INDIA
AADHAAR - MERA AADHAAR, MERI PEHCHAN

Name: Rahul Sharma
Father's Name: Suresh Sharma
Date of Birth (DOB): 12/05/2005
Gender: MALE
Aadhaar No: XXXX-XXXX-9912
Address: H.No 42, Green Park Extension, New Delhi - 110016
Issue Date: 10/01/2021
Status: ACTIVE / VERIFIED
        `.trim(),
        extractedData: {
          candidateName: 'Rahul Sharma',
          dateOfBirth: '12/05/2005',
          documentNumber: 'XXXX-XXXX-9912',
          issueDate: '10/01/2021',
          expiryDate: null,
          authority: 'Unique Identification Authority of India (UIDAI)',
          extraDetails: {
            fatherName: 'Suresh Sharma',
            gender: 'Male',
            documentType: 'Aadhaar Card',
          },
          confidence: 96,
          isReadable: true,
          unreadableReason: null,
        },
      },
      {
        id: 'doc-demo-marksheet',
        filename: 'Synthetic_Class_XII_Marksheet_Rahul.pdf',
        mimeType: 'application/pdf',
        size: 384100,
        docCategory: 'MARKSHEET',
        isSynthetic: true,
        rawText: `
CENTRAL BOARD OF SECONDARY EDUCATION, DELHI
SENIOR SCHOOL CERTIFICATE EXAMINATION 2023
MARKS STATEMENT & PASS CERTIFICATE

Candidate Name: Rahul S. Sharma
Father's Name: Suresh Sharma
Mother's Name: Sunita Sharma
Roll Number: CBSE-2023-884120
Date of Birth: 12/05/2005
School: Delhi Public School, R.K. Puram, New Delhi
Result: PASS
Overall Percentage: 88.4%
Issue Date: 22/05/2023
        `.trim(),
        extractedData: {
          candidateName: 'Rahul S. Sharma',
          dateOfBirth: '12/05/2005',
          documentNumber: 'CBSE-2023-884120',
          issueDate: '22/05/2023',
          expiryDate: null,
          authority: 'Central Board of Secondary Education (CBSE)',
          extraDetails: {
            fatherName: 'Suresh Sharma',
            motherName: 'Sunita Sharma',
            score: '88.4%',
            passingYear: '2023',
          },
          confidence: 94,
          isReadable: true,
          unreadableReason: null,
        },
      },
      {
        id: 'doc-demo-income',
        filename: 'Synthetic_Income_Certificate_Rahul.pdf',
        mimeType: 'application/pdf',
        size: 295000,
        docCategory: 'INCOME_CERTIFICATE',
        isSynthetic: true,
        rawText: `
OFFICE OF THE TAHSILDAR / REVENUE OFFICER
REVENUE DEPARTMENT, GOVT. OF NCT OF DELHI
ANNUAL FAMILY INCOME CERTIFICATE

Certificate No: REV/INC/2023/4491
Date of Issue: 14/08/2023
Valid Till: 13/08/2024

This is to certify that:
Candidate Name: Rahul Sharma
Father's Name: Suresh Sharma
Date of Birth: 12/05/2004
Total Annual Family Income: INR 1,80,000/- (Rupees One Lakh Eighty Thousand Only)
Purpose: Higher Education Financial Scholarship
Issuing Authority: Office of the Tahsildar, District South, New Delhi
        `.trim(),
        extractedData: {
          candidateName: 'Rahul Sharma',
          dateOfBirth: '12/05/2004', // Synthetic DOB discrepancy intentionally included: 2004 vs 2005
          documentNumber: 'REV/INC/2023/4491',
          issueDate: '14/08/2023',
          expiryDate: '13/08/2024', // Expired or older than 1 year
          authority: 'Office of the Tahsildar, District South',
          extraDetails: {
            incomeAmount: 'INR 1,80,000',
            purpose: 'Higher Education Scholarship',
          },
          confidence: 92,
          isReadable: true,
          unreadableReason: null,
        },
      },
      // Note: Application Form is intentionally MISSING to demonstrate missing mandatory document detection!
    ],
  },
};

module.exports = {
  SYNTHETIC_DEMO_CASES,
};

