import * as fs from "fs";

function main() {
  const fd = fs.openSync("uploads/resumes/resume-1778082785733-473865110.pdf", "r");
  const buffer = Buffer.alloc(100);
  fs.readSync(fd, buffer, 0, 100, 0);
  console.log("First 100 bytes of file as string:\n", buffer.toString("utf-8"));
  console.log("File size:", fs.statSync("uploads/resumes/resume-1778082785733-473865110.pdf").size);
}
main();
