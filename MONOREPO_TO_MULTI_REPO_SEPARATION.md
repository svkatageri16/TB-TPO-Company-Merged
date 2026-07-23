# 📂 VEGA — Monorepo Separation & Modular Architecture Setup
## Guide to Splitting your Project into Independent Frontend and Backend Packages

To scale your application for systems like **Vercel (Frontend)** and **Railway/AWS (Backend)**, it is standard best practice to divide your combined project into separate, self-contained directories: a `frontend/` repository and a `backend/` repository.

This handbook details the exact file mappings, configuration sheets, dependencies, and environment files required to split the combined code seamlessly.

---

## 🏗️ 1. The Target Split Architecture Tree

Once separated, your directory templates will look like this:

### 🌐 A. The Frontend Repository (`/frontend`)
Contains only your Vite, React, Tailwind, and client assets. It has **no** database connectivities, backend ports, or server-side keys.
```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/                # Custom assets, banners, avatars
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/        # UI components (cards, buttons)
    ├── pages/             # All user/admin dashboards and pages
    ├── context/           # React authentication state providers
    └── services/          # API handlers and Axios clients
```

### ⚙️ B. The Backend Repository (`/backend`)
Contains only your Express API, router controllers, SQLite/PostgreSQL connectors, and background queues. It has **no** UI pages, JSX layout scripts, or CSS files.
```
backend/
├── server.ts              # Entry point Express script
├── package.json
├── tsconfig.json
├── .env.example
├── server/
│   ├── db.ts              # DB setups (SQLite / Postgres)
│   ├── routes/            # API endpoints (coding, xp, auth)
│   ├── middleware/        # JWT verifications and rate limiters
│   └── workers/           # Asynchronous background workers
└── uploads/               # Local buffer storage structures
```

---

## 📦 2. Configuration Setup Sheets

### 🌐 Frontend Setup Files (`frontend/package.json`)
The client uses modern React + Vite + Tailwind, and uses Axios to query your backend.

```json
{
  "name": "vega-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "tailwindcss": "@import",
    "lucide-react": "^0.368.0",
    "motion": "^11.0.8",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "recharts": "^2.12.3",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "i18next": "^23.10.1",
    "react-i18next": "^14.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}
```

### ⚙️ Backend Setup Files (`backend/package.json`)
The server uses TypeScript and Express, compiling directly using standard ts-node or esbuild.

```json
{
  "name": "vega-backend",
  "version": "1.0.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@google/genai": "^0.1.1",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.9",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.11.30",
    "@types/pg": "^8.11.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.3"
  }
}
```

---

## ⚡ 3. Key Architectural Adaptations (Axios client vs CORS Server)

Separation requires your client and server to communicate over HTTP using different domains. To prevent **CORS blocks** and authentication failures:

### A. The Client-side API caller (`frontend/src/services/api.ts`)
Configure your Axios engine to read your dynamic backend endpoint configuration variables:

```typescript
import axios from 'axios';

// Resolve host URL based on target environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // Crucial: Instructs Axios to send Cookies automatically across sub-domains
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### B. The Server-side Domain Gateway (`backend/server.ts`)
Your server must permit Cross-Origin Resource Sharing (CORS) explicitly for your frontend client URL:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.CLIENT_URL,      // Your live Vercel URL (e.g., https://vega.vercel.app)
  'http://localhost:5173',     // Local Vite Dev server port
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Access rejected by CORS Policy: Domain not allowed.'));
    }
  },
  credentials: true, // Permits cookie-based session keys (JWT cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Bind routes
// app.use('/api/auth', authRouter);
// app.use('/api/coding', codingRouter);

app.listen(PORT, () => {
  console.log(`[Backend-Service] Running on Server Port ${PORT}`);
});
```

---

## 💡 How to split in Git with historical preservation

If your project is currently configured as a single combined monorepo and you want to commit separate projects:

1.  **Method A: Separate Gits (Recommended)**
    *   Initialize two brand new, separate Git repositories on GitHub: `vega-frontend` and `vega-backend`.
    *   Create a local folder `vega-frontend`, copy index.html, public/, src/, package.json into it, run `git init`, push to frontend repo.
    *   Create a local folder `vega-backend`, copy server.ts, server/, package.json into it, run `git init`, push to backend repo.
2.  **Method B: Standard Monorepo structure**
    *   Maintain one root repository but restructure files into dedicated subfolders (`frontend/` and `backend/`). This is often managed via **Docker Compose** or **Vite Workspace Workspaces**.
