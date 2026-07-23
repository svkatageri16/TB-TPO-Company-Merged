import fetch from "node-fetch";

async function test() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE5LCJyb2xlIjoiVVNFUiIsImlhdCI6MTc3OTIxNDg0NSwiZXhwIjoxNzc5MjE4NDQ1fQ.t5qiORTDSVcs3iMB1b8KUubPfjqZK2NX6wSO5Gm5P-w";
  const chatRes = await fetch("http://localhost:3000/api/chatbot/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ message: "Hello", platformContext: "/dashboard" })
  });

  const text = await chatRes.text();
  console.log("Chat response:", text);
}
test();
