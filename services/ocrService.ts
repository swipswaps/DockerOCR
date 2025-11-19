import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "../types";

// Initialize Gemini
// Note: In a real production app, you might route this through a backend proxy to keep the key secure,
// or use the Docker container as requested in the prompt.
// For this web demo, we use the client-side SDK directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performOCRExtraction = async (
  file: File, 
  base64Data: string,
  onLog: (msg: string) => void
): Promise<OCRResult> => {
  
  onLog(`Initializing extraction engine...`);
  
  const model = 'gemini-2.5-flash'; // Fast, accurate, cost-effective
  
  onLog(`Selected model: ${model} for high-speed extraction.`);
  onLog(`Uploading ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);

  const prompt = `
    Perform high-fidelity OCR on this image. 
    The image likely contains a list of items, possibly solar energy equipment (inverters, panels, frames).
    
    Extract all text and bounding boxes.
    Treat this as a data extraction task. Be precise with numbers and product codes.
  `;

  // Extract mime type from base64 header if present, otherwise fallback to file.type
  let mimeType = file.type;
  const match = base64Data.match(/^data:(.+);base64,/);
  if (match) {
    mimeType = match[1];
  }

  // Remove header from base64 for the API
  const cleanBase64 = base64Data.split(',')[1];

  try {
    onLog(`Sending inference request to neural network...`);
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

  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || "Extraction failed");
  }
};
