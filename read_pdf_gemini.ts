import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function main() {
  try {
    const pdfPath = "uploads/resumes/resume-1778082785733-473865110.pdf";
    console.log("Reading PDF from:", pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Data = pdfBuffer.toString("base64");

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64Data
      }
    };

    console.log("Sending PDF to Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        pdfPart,
        { text: "Read this PDF document completely and extract all text, lists, resumes, instructions, or guidelines written inside it. Write it down completely." }
      ]
    });

    const parsedText = response.text || "No text returned.";
    fs.writeFileSync("pdf-extracted-by-gemini.txt", parsedText);
    console.log("Successfully extracted text via Gemini. Characters:", parsedText.length);
    console.log("\n--- EXCERPT OF PDF CONTENT ---");
    console.log(parsedText.substring(0, 1500));
    console.log("------------------------------\n");
  } catch (err: any) {
    console.error("Error reading PDF via Gemini:", err.message);
  }
}

main();
