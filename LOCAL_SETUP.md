# VEGA Solapur - Local Setup Guide

## Prerequisites
- Node.js (v18+)
- MySQL
- Redis (Optional for now, emulated in code)
- Gemini API Key

## 1. Database Setup
1. Install MySQL and create a database named `vega`.
2. Update your `.env` file (copy from `.env.example`) with the following variables:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=vega
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_secret_key
   VITE_API_URL=http://localhost:3000/api
   ```
   *Note: Ensure your MySQL service is running before starting the app.*

## 2. Dependencies
Run the following command in the root directory:
```bash
npm install
```

## 3. Start Development Server
```bash
npm run dev
```
The server will run on `http://localhost:3000`.

## 4. Project Flow
1. **Students**: Register -> Build Resume (AI) -> Practice Mock Interview (Voice + Video) -> Take Job Assessment -> Track Applications.
2. **Companies**: Register -> Upload GST/PAN -> Wait for Admin Approval -> Post Jobs -> Create Tests -> View Applicants and Shortlist.
3. **Admins**: Login using default credentials:
   - Email: `admin@vega.com`
   - Password: `admin123`
   - Actions: View Pending Companies -> Approve/Reject -> Monitor System Activity.

## 5. Docker Setup
If you have Docker installed, you can use:
```bash
docker-compose up -d
```
This will start MySQL and the App together.
