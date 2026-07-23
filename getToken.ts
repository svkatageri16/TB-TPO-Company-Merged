import jwt from "jsonwebtoken";
const token = jwt.sign({ userId: 19, role: "USER" }, process.env.JWT_SECRET || "supersecret123", { expiresIn: "1h" });
console.log(token);
