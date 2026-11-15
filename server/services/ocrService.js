// server/services/ocrService.js

const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { extractDocumentInformation } = require('./extractorService');

/**
 * Extract text from PDF buffer/file using PDFParse
 */
async function extractTextFromPDF(filePathOrBuffer) {
  try {
    let buffer;
    if (typeof filePathOrBuffer === 'string') {
      buffer = fs.readFileSync(filePathOrBuffer);
    } else {
      buffer = filePathOrBuffer;
    }

    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    await parser.load();
    const parsedResult = await parser.getText();
    await parser.destroy();

    let extractedText = '';
    if (typeof parsedResult === 'string') {
      extractedText = parsedResult;
    } else if (parsedResult && typeof parsedResult.text === 'string') {
      extractedText = parsedResult.text;
    } else if (parsedResult && Array.isArray(parsedResult.pages)) {
      extractedText = parsedResult.pages.map(p => p.text || '').join('\n');
    }

    return {
      text: extractedText,
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('PDF text extraction error:', err);
    return {
      text: '',
      success: false,
      error: `PDF extraction failed: ${err.message}`,
    };
  }
}

/**
 * Extract text from Image file using Tesseract.js OCR
 */
async function extractTextFromImage(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Run Tesseract OCR
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: m => {
        // Silent or debug log
      },
    });

    const ocrText = result?.data?.text || '';
    const ocrConfidence = result?.data?.confidence || 0;

    return {
      text: ocrText,
      confidence: Math.round(ocrConfidence),
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('Tesseract OCR error:', err);
    return {
      text: '',
      confidence: 0,
      success: false,
      error: `OCR engine error: ${err.message}`,
    };
  }
}

/**
 * Process a document file (either PDF or image)
 */
async function processDocumentFile(fileInfo, docCategory) {
  const { path: filePath, mimetype, originalname } = fileInfo;
  const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');

  let rawText = '';
  let ocrConfidence = 85;
  let extractionError = null;

  if (isPdf) {
    const pdfResult = await extractTextFromPDF(filePath);
    rawText = pdfResult.text;
    if (!pdfResult.success) {
      extractionError = pdfResult.error;
    }

    // If PDF text is very sparse (scanned PDF), try fallback if feasible
    if (!rawText || rawText.trim().length < 20) {
      console.log(`PDF text is sparse (${rawText.length} chars). Might be a scanned image PDF.`);
    }
  } else {
    // Image OCR
    const imageResult = await extractTextFromImage(filePath);
    rawText = imageResult.text;
    ocrConfidence = imageResult.confidence;
    if (!imageResult.success) {
      extractionError = imageResult.error;
    }
  }

  // Run Information Extraction
  const extracted = extractDocumentInformation(rawText, docCategory);

  // If OCR had its own confidence, blend it
  if (ocrConfidence > 0 && extracted.confidence) {
    extracted.confidence = Math.round((extracted.confidence * 0.6) + (ocrConfidence * 0.4));
  }

  if (extractionError && !extracted.isReadable) {
    extracted.unreadableReason = extractionError;
  }

  return {
    rawText,
    extractedData: extracted,
  };
}

module.exports = {
  processDocumentFile,
  extractTextFromPDF,
  extractTextFromImage,
};

