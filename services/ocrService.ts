import { GoogleGenAI, Type } from "@google/genai";
import { OCREngine, OCRResult } from "../types";
import { requireApiKey } from "../config/env";
import { GEMINI_MODEL } from "../constants";

// Initialize Gemini with validated API key
const getAI = () => {
  const apiKey = requireApiKey();
  return new GoogleGenAI({ apiKey });
};

const performGeminiExtraction = async (
  file: File,
  base64Data: string,
  onLog: (msg: string) => void
): Promise<OCRResult> => {
  onLog(`Initializing Gemini 2.5 Flash...`);

  const model = GEMINI_MODEL;
  const ai = getAI();

  onLog(`Selected model: ${model} for high-speed extraction.`);
  onLog(`Uploading ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);

  const prompt = `
    Perform high-fidelity OCR on this image. 
    The image likely contains a list of items, possibly solar energy equipment (inverters, panels, frames).
    
    Extract all text and bounding boxes.
    Treat this as a data extraction task. Be precise with numbers and product codes.
    
    Return a JSON object with:
    - text: The full text extracted from the image, preserving the original layout, newlines, and spacing as closely as possible. Do not flatten the text into a single line. Represents the document structure.
    - blocks: An array of detected blocks with "text", "confidence" (0-1), and "bbox" (array of coord arrays).
  `;

  let mimeType = file.type;
  const match = base64Data.match(/^data:(.+);base64,/);
  if (match) {
    mimeType = match[1];
  }
  const cleanBase64 = base64Data.split(',')[1];

  const generateRequest = async (useSchema: boolean) => {
    const config: any = {
      responseMimeType: "application/json",
    };

    if (useSchema) {
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "Full text extracted from the image, preserving original newlines and layout." },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                bbox: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                  }
                }
              },
              required: ["text", "confidence", "bbox"]
            }
          }
        },
        required: ["text", "blocks"]
      };
    }

    return ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: config
    });
  };

  try {
    onLog(`Sending inference request to neural network...`);
    const response = await generateRequest(true);

    onLog(`Inference complete. Parsing response vector...`);
    
    const text = response.text;
    if (!text) throw new Error("No text returned from model");

    const parsed = JSON.parse(text);
    
    const result: OCRResult = {
      file: file.name,
      text: parsed.text,
      blocks: parsed.blocks || []
    };
    
    onLog(`Normalization complete. ${result.blocks.length} blocks identified.`);
    
    return result;

  } catch (error) {
    console.error(error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStatus = (error as any)?.status;

    // Check for 500 Internal Error or similar API failures
    if (errorMessage.includes('500') || errorStatus === 500 || errorMessage.includes('Internal') || errorMessage.includes('Json')) {
      onLog('WARN: Strict schema failed (API 500/Internal). Retrying with loose JSON mode...');

      try {
        const response = await generateRequest(false);
        const text = response.text;
        if (!text) throw new Error("No text returned from fallback");

        // Clean markdown formatting if present (e.g. ```json ... ```)
        const cleanText = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanText);

        return {
          file: file.name,
          text: parsed.text || "",
          blocks: parsed.blocks || []
        };
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        throw new Error(`Fallback failed: ${fallbackMessage}`);
      }
    }

    throw new Error(errorMessage || "Gemini extraction failed");
  }
};

const performPaddleExtraction = async (
  file: File,
  base64Data: string,
  onLog: (msg: string) => void
): Promise<OCRResult> => {
  onLog('Connecting to PaddleOCR container (port 5000)...');

  const paddleEndpoint = 'http://localhost:5000/ocr';

  try {
    // Extract clean base64 data
    const cleanBase64 = base64Data.split(',')[1] || base64Data;

    onLog('Sending image to PaddleOCR container...');

    // Make actual HTTP request to PaddleOCR Docker container
    const response = await fetch(paddleEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: cleanBase64,
        filename: file.name
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR API returned ${response.status}: ${response.statusText}`);
    }

    onLog('PP-OCRv4 detection model loaded.');
    onLog('Running classification & text recognition heads...');

    const result = await response.json();

    onLog('Processing bounding boxes (dt_boxes)...');

    // Transform PaddleOCR response to our OCRResult format
    // Expected PaddleOCR response format: { text: string, blocks: Array<{text, confidence, bbox}> }
    const ocrResult: OCRResult = {
      file: file.name,
      text: result.text || result.blocks?.map((b: any) => b.text).join('\n') || '',
      blocks: result.blocks || []
    };

    onLog(`PaddleOCR extraction successful. ${ocrResult.blocks.length} blocks detected.`);
    return ocrResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a network/connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
      onLog('WARN: PaddleOCR Docker container not reachable. Is it running on port 5000?');
      onLog('Falling back to Gemini Vision API...');

      try {
        // Fallback to Gemini
        const geminiResult = await performGeminiExtraction(file, base64Data, () => {
          // Suppress Gemini logs in fallback mode
        });

        onLog('Fallback extraction successful using Gemini.');
        return geminiResult;
      } catch (geminiError) {
        throw new Error('Both PaddleOCR and Gemini fallback failed. Please check Docker container and API key.');
      }
    }

    // For other errors, throw them
    throw new Error(`PaddleOCR extraction failed: ${errorMessage}`);
  }
};

export const performOCRExtraction = async (
  file: File, 
  base64Data: string,
  onLog: (msg: string) => void,
  engine: OCREngine = 'GEMINI'
): Promise<OCRResult> => {
  if (engine === 'PADDLE') {
    return performPaddleExtraction(file, base64Data, onLog);
  } else {
    return performGeminiExtraction(file, base64Data, onLog);
  }
};