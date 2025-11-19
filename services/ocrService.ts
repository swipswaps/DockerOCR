import { GoogleGenAI, SchemaType } from "@google/genai";
import { OCRResult } from "../types";

// Initialize Gemini
// Note: In a real production app, you might route this through a backend proxy to keep the key secure,
// or use the Docker container as requested in the prompt.
// For this web demo, we use the client-side SDK directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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
    
    Return a purely JSON response with the following structure:
    {
      "file": "${file.name}",
      "text": "Full concatenated text found in the image",
      "blocks": [
        {
          "text": "text of the line or block",
          "confidence": 0.99,
          "bbox": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]] (normalized 0-1000 coordinates)
        }
      ]
    }

    Treat this as a data extraction task. Be precise with numbers and product codes.
  `;

  // Remove header from base64 for the API
  const cleanBase64 = base64Data.split(',')[1];

  try {
    onLog(`Sending inference request to neural network...`);
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    onLog(`Inference complete. Parsing response vector...`);
    
    const text = response.text;
    if (!text) throw new Error("No text returned from model");

    const result = JSON.parse(text) as OCRResult;
    
    // Ensure filename matches exactly what we sent if the model hallucinated it
    result.file = file.name;
    
    onLog(`Normalization complete. ${result.blocks.length} blocks identified.`);
    
    return result;

  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || "Extraction failed");
  }
};
