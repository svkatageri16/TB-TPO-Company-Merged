import fetch from "node-fetch";
async function run() {
  try {
    const res = await fetch("http://0.0.0.0:3000/api/ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Keep practicing and updating your profile to boost your employability score.", targetLanguage: "mr" })
    });
    console.log(res.status);
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
run();
