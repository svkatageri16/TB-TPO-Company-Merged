const fs = require('fs');
const pdf = require('pdf-parse');

async function main() {
  try {
    const dataBuffer = fs.readFileSync("uploads/resumes/resume-1778082785733-473865110.pdf");
    const uint8Array = new Uint8Array(dataBuffer);
    const instance = new pdf.PDFParse(uint8Array);
    
    console.log("Loading document...");
    await instance.load();
    console.log("Document loaded successfully. Checking document info...");
    
    const info = await instance.getInfo();
    console.log("Document Info:", info);
    
    // Let's see if we can get page-by-page text textually
    console.log("Reading pages...");
    let fullText = "";
    // pdf-parse instances normally have page count in progress or doc
    const pageCount = instance.doc ? instance.doc.numPages : 100; // Let's try to find page count
    console.log("Page count approx:", pageCount);
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        const pageText = await instance.getPageText(i);
        console.log(`Page ${i} length:`, pageText ? pageText.length : 0);
        if (pageText) {
          fullText += pageText + "\n";
        }
      } catch (pageErr) {
        // Stop if we run out of pages
        console.log(`Stop checking pages. Failed to read page ${i}:`, pageErr.message);
        break;
      }
    }
    
    fs.writeFileSync("pdf-content.txt", fullText);
    console.log("Successfully extracted text. Characters:", fullText.length);
    console.log("Snippet:\n", fullText.substring(0, 1000));
  } catch (err) {
    console.error("Error during parser execution:", err.stack);
  }
}

main();
