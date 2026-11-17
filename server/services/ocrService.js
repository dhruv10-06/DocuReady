// server/services/ocrService.js

const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { extractDocumentInformation } = require('./extractorService');

/**
 * Locate local traineddata directory deterministically
 */
function getTrainedDataDirectory() {
  const candidatePaths = [
    path.join(__dirname, '..', 'data', 'tessdata'),
    path.join(__dirname, '..', 'tessdata'),
    path.join(__dirname, '..'),
    path.join(process.cwd(), 'server', 'data', 'tessdata'),
    path.join(process.cwd(), 'data', 'tessdata'),
    process.cwd(),
  ];

  for (const dir of candidatePaths) {
    if (fs.existsSync(path.join(dir, 'eng.traineddata')) || fs.existsSync(path.join(dir, 'eng.traineddata.gz'))) {
      return dir;
    }
  }

  return path.join(__dirname, '..', 'data', 'tessdata');
}

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
 * Extract text from Image file using Tesseract.js OCR with robust worker lifecycle
 */
async function extractTextFromImage(filePath) {
  let worker = null;
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const tessDataDir = getTrainedDataDirectory();

    // Initialize worker with explicit local traineddata path and safe error boundary
    worker = await createWorker('eng', 1, {
      langPath: tessDataDir,
      cachePath: tessDataDir,
      gzip: false,
      errorHandler: (err) => {
        console.error('Tesseract Worker caught error:', err?.message || err);
      },
      logger: () => {},
    });

    const result = await worker.recognize(filePath);
    const ocrText = result?.data?.text || '';
    const ocrConfidence = Math.round(result?.data?.confidence || 0);

    await worker.terminate();
    worker = null;

    return {
      text: ocrText,
      confidence: ocrConfidence,
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('Tesseract OCR error handled safely:', err.message);
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        // ignore termination errors on failure
      }
      worker = null;
    }
    return {
      text: '',
      confidence: 0,
      success: false,
      error: `OCR engine error: ${err.message}`,
    };
  }
}

// Configurable OCR Confidence Threshold (Defaults to 50%)
const OCR_CONFIDENCE_THRESHOLD = parseInt(process.env.OCR_CONFIDENCE_THRESHOLD, 10) || 50;

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

    if (!rawText || rawText.trim().length < 20) {
      console.log(`PDF text is sparse (${(rawText || '').length} chars). Might be a scanned image PDF.`);
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

  // Run Information Extraction & Quality Evaluation
  const extracted = extractDocumentInformation(rawText, docCategory);

  // If extraction error occurred, mark as unreadable
  if (extractionError) {
    extracted.isReadable = false;
    extracted.unreadableReason = extractionError;
    extracted.confidence = 0;
  } else if (!isPdf) {
    // Image OCR Quality Checks
    if (ocrConfidence < OCR_CONFIDENCE_THRESHOLD) {
      // If OCR confidence is below threshold and no strong identity/document fields were found
      if (!extracted.candidateName && (!extracted.quality || extracted.quality.keywordMatches < 2)) {
        extracted.isReadable = false;
        extracted.unreadableReason = `OCR confidence score (${ocrConfidence}%) is below acceptable threshold (${OCR_CONFIDENCE_THRESHOLD}%). Text contains insufficient legible characters or no recognizable document structure.`;
        extracted.confidence = Math.min(35, ocrConfidence);
      } else {
        // Borderline OCR with some isolated keywords: blend confidence accurately
        extracted.confidence = Math.round((extracted.confidence * 0.5) + (ocrConfidence * 0.5));
      }
    } else {
      extracted.confidence = Math.round((extracted.confidence * 0.6) + (ocrConfidence * 0.4));
    }
  } else {
    // PDF text sparse check
    if (!rawText || rawText.trim().length < 20) {
      extracted.isReadable = false;
      extracted.unreadableReason = 'PDF file contains no extractable digital text. If this is a scanned document, please submit an image format (JPG/PNG) or an OCR-searchable PDF.';
      extracted.confidence = 10;
    }
  }

  // Final sanity check: if marked unreadable, ensure confidence is not falsely high
  if (!extracted.isReadable) {
    extracted.confidence = Math.min(extracted.confidence, 40);
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

