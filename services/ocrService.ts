import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "../types";

// Initialize Gemini with error handling in case API key is missing during dev
const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is not set in the environment.");
    throw new Error("API Key missing. Please configure your environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const performOCRExtraction = async (
  file: File, 
  base64Data: string,
  onLog: (msg: string) => void
): Promise<OCRResult> => {
  
  const ai = getAIClient();

  onLog(`Initializing extraction engine...`);
  
  const model = 'gemini-2.5-flash'; // Fast, accurate, cost-effective multimodal model
  
  onLog(`Selected model: ${model} for high-speed extraction.`);
  onLog(`Uploading ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);

  const prompt = `
    Perform high-fidelity OCR on this image. 
    The image likely contains a list of items, possibly solar energy equipment (inverters, panels, frames).
    
    Extract all text and bounding boxes.
    Treat this as a data extraction task. Be precise with numbers and product codes.
  `;

  // Robust Mime Type Handling
  // 1. Start with file.type
  let mimeType = file.type;
  
  // 2. If file.type is empty or generic octet-stream, try to deduce from extension
  if ((!mimeType || mimeType === 'application/octet-stream' || mimeType === '') && file.name) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'heic' || ext === 'heif') {
      mimeType = 'image/heic';
    } else if (ext === 'jpg' || ext === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === 'png') {
      mimeType = 'image/png';
    } else if (ext === 'webp') {
      mimeType = 'image/webp';
    }
  }

  // 3. Check base64 data prefix. 
  // IMPORTANT: Do NOT let a generic 'application/octet-stream' from the FileReader overwrite 
  // a specific mime type we derived from the extension (like image/heic).
  const match = base64Data.match(/^data:(.+);base64,/);
  if (match) {
    const detectedMime = match[1];
    if (detectedMime !== 'application/octet-stream' || !mimeType) {
      mimeType = detectedMime;
    }
  }

  // 4. Final Fallback to ensure API acceptance
  if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
     mimeType = 'image/jpeg'; 
  }

  // Remove header from base64 for the API
  const cleanBase64 = base64Data.split(',')[1] || base64Data;

  try {
    onLog(`Sending inference request to neural network (MIME: ${mimeType})...`);
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Full concatenated text found in the image" },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  bbox: {
                    type: Type.ARRAY,
                    description: "The bounding box of the detected text, represented as 4 points: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]].",
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
        }
      }
    });

    onLog(`Inference complete. Parsing response vector...`);
    
    let text = response.text;
    if (!text) throw new Error("No text returned from model");

    // Robust JSON parsing: strip markdown code blocks if present
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(text);
    
    const result: OCRResult = {
      file: file.name,
      text: parsed.text,
      blocks: parsed.blocks || []
    };
    
    onLog(`Normalization complete. ${result.blocks.length} blocks identified.`);
    
    return result;

  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || "Extraction failed");
  }
};