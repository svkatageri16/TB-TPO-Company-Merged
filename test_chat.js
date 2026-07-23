import fetch from "node-fetch";

async function test() {
  // get token
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saiprasad26102004@gmail.com", password: "password123" }) // assuming password or any valid login
  });
  const data = await res.json();
  console.log("Login:", data);
  if (!data.token) return;

  const chatRes = await fetch("http://localhost:3000/api/chatbot/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.token}`
    },
    body: JSON.stringify({ message: "Hello", platformContext: "/dashboard" })
  });

  const text = await chatRes.text();
  console.log("Chat response:", text);
}
test();
