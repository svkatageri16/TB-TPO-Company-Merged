import fs from "fs";

let content = fs.readFileSync("./server/routes/job.ts", "utf8");

// Strip single-line comments
content = content.replace(/\/\/.*$/gm, "");

// Strip multi-line comments
content = content.replace(/\/\*[\s\S]*?\*\//g, "");

// Count occurrences of backticks
const backticks = (content.match(/`/g) || []).length;
console.log(`Total active backticks (after stripping comments): ${backticks}`);

if (backticks % 2 !== 0) {
  console.log("CRITICAL: There is an unmatched active backtick!");
  
  // Let's locate where active backticks are
  const lines = content.split("\n");
  let open = false;
  let lastOpenLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let pos = line.indexOf("`");
    while (pos !== -1) {
      open = !open;
      if (open) {
        lastOpenLine = i + 1;
      } else {
        lastOpenLine = -1;
      }
      pos = line.indexOf("`", pos + 1);
    }
  }
  
  if (lastOpenLine !== -1) {
    console.log(`Unmatched backtick begins around line: ${lastOpenLine}`);
  }
} else {
  console.log("Active backticks are fully balanced!");
}
