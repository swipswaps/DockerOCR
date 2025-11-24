import { GoogleGenAI, Type } from "@google/genai";
import { OCREngine, OCRResult } from "../types";
import { requireApiKey } from "../config/env";
import { GEMINI_MODEL } from "../constants";
import { checkContainerHealth } from "./dockerService";
import { pollDockerLogs, formatDockerLog } from "./dockerLogService";

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
  onLog: (msg: string) => void,
  onDockerError?: () => void
): Promise<OCRResult> => {
  onLog('🔍 Checking PaddleOCR container health...');

  // Self-healing: Check container health first
  const healthStatus = await checkContainerHealth();

  if (!healthStatus.containerHealthy) {
    onLog(`⚠️ ${healthStatus.message}`);

    if (healthStatus.canAutoFix) {
      onLog('🔧 PaddleOCR is initializing. Waiting up to 30 seconds...');

      // Wait with retries (check every 5 seconds for up to 30 seconds)
      let retries = 6;
      let ready = false;

      for (let i = 0; i < retries; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        onLog(`⏳ Checking readiness... (${(i + 1) * 5}s / 30s)`);

        const retryStatus = await checkContainerHealth();
        if (retryStatus.containerHealthy) {
          ready = true;
          onLog('✅ PaddleOCR is now ready!');
          break;
        }
      }

      if (!ready) {
        onLog('❌ PaddleOCR did not become ready within 30 seconds');
        onLog('💡 Try waiting a bit longer, then click "Start Extraction" again');
        onLog('💡 Or restart the container: docker compose restart paddleocr');
        if (onDockerError) {
          onDockerError();
        }
        throw new Error('DOCKER_NOT_READY');
      }
    } else {
      onLog('❌ Docker not available. Please start the container.');
      if (onDockerError) {
        onDockerError();
      }
      throw new Error('DOCKER_NOT_AVAILABLE');
    }
  }

  onLog('✅ PaddleOCR is ready to process images');
  onLog('Connecting to PaddleOCR container (port 5000)...');

  const paddleEndpoint = 'http://localhost:5000/ocr';

  // Extract clean base64 data (rotation already applied in App.tsx after image load)
  const cleanBase64 = base64Data.split(',')[1] || base64Data;

  onLog('Sending image to PaddleOCR container...');
  onLog('📡 Streaming Docker container logs...');

  // Start polling Docker logs for real-time progress
  const stopPolling = pollDockerLogs((newLogs) => {
    newLogs.forEach(log => {
      // Show ALL Docker logs verbatim
      const formattedLog = formatDockerLog(log);
      onLog(formattedLog);
    });
  }, 500); // Poll every 500ms for faster updates

  try {
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

    // Stop polling after request completes
    stopPolling();

    if (!response.ok) {
      // Try to get detailed error from response
      let errorDetails = '';
      try {
        const errorData = await response.json();

        // Handle 503 Service Unavailable (PaddleOCR not ready)
        if (response.status === 503 && errorData.status === 'not_ready') {
          onLog('⚠️ ═══════════════════════════════════════════════════');
          onLog('⚠️ PADDLEOCR NOT READY');
          onLog('⚠️ ═══════════════════════════════════════════════════');
          onLog(`⚠️ ${errorData.error || errorData.message}`);

          if (errorData.hint) {
            onLog(`💡 HINT: ${errorData.hint}`);
          }

          if (errorData.error) {
            onLog(`📋 Details: ${errorData.error}`);
          }

          onLog('⚠️ ═══════════════════════════════════════════════════');

          // Stop polling
          stopPolling();

          throw new Error('PaddleOCR is not ready yet. Please wait 10-30 seconds after container start and try again.');
        }

        if (errorData.error_type) {
          errorDetails = `${errorData.error_type}: ${errorData.error}`;

          onLog('❌ ═══════════════════════════════════════════════════');
          onLog(`❌ ERROR: ${errorData.error_type}`);
          onLog(`❌ MESSAGE: ${errorData.error}`);

          if (errorData.hint) {
            onLog(`💡 HINT: ${errorData.hint}`);
          }

          if (errorData.traceback) {
            onLog('📋 FULL DOCKER TRACEBACK:');
            onLog('─────────────────────────────────────────────────');
            // Show FULL traceback verbatim
            const traceLines = errorData.traceback.split('\n');
            traceLines.forEach((line: string) => {
              if (line.trim()) {
                onLog(line);
              }
            });
            onLog('═══════════════════════════════════════════════════');
          }
        } else {
          errorDetails = errorData.error || response.statusText;
        }
      } catch {
        errorDetails = response.statusText;
      }
      throw new Error(`${errorDetails}`);
    }

    const result = await response.json();

    // The server now logs progress, so we don't need to fake it
    // Just show the final success message
    onLog('✅ PaddleOCR processing complete');

    // PaddleOCR server now handles table detection and sorting
    // Transform PaddleOCR response to our OCRResult format
    // Expected PaddleOCR response format: { text: string, blocks: Array<{text, confidence, bbox}> }
    const ocrResult: OCRResult = {
      file: file.name,
      text: result.text || '',
      blocks: result.blocks || []
    };

    onLog(`✅ PaddleOCR extraction successful. ${ocrResult.blocks.length} blocks detected.`);
    return ocrResult;

  } catch (error) {
    // Make sure to stop polling on error
    stopPolling();

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Don't fallback if it's a Docker setup issue - let the UI handle it
    if (errorMessage === 'DOCKER_NOT_READY' || errorMessage === 'DOCKER_NOT_AVAILABLE') {
      throw error;
    }

    // Check if it's a network/connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
      onLog('⚠️ WARN: PaddleOCR Docker container not reachable');

      // Trigger Docker setup helper
      if (onDockerError) {
        onDockerError();
      }

      onLog('🔄 Falling back to Gemini Vision API...');

      try {
        // Fallback to Gemini
        const geminiResult = await performGeminiExtraction(file, base64Data, (msg) => {
          onLog(`[Gemini Fallback] ${msg}`);
        });

        onLog('✅ Fallback extraction successful using Gemini.');
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
  engine: OCREngine = 'GEMINI',
  onDockerError?: () => void
): Promise<OCRResult> => {
  if (engine === 'PADDLE') {
    return performPaddleExtraction(file, base64Data, onLog, onDockerError);
  } else {
    return performGeminiExtraction(file, base64Data, onLog);
  }
};