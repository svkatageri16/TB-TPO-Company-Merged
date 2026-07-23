# ☁️ Vercel Frontend + Railway Backend & Database (MySQL) Deployment Guide
## Scaling VEGA with a Completely Serverless / Multi-Platform Hybrid Architecture

Yes! Deploying your **Frontend on Vercel** and your **Backend Server + Database (MySQL/PostgeSQL) on Railway** is one of the most popular, modern, and developer-friendly hybrid structures available. 

This model separates your client-side assets from your backend compute, allowing your frontend to load instantly via massive CDN networks, while your backend dynamically scales on Railway isolated from storage locks.

---

## 🗺️ High-Level Hybrid Service Mapping

Under this architectural setup, your workspace components are distributed across separate global clouds:

```
                      [ USER CLIENT BROWSER ACCESS ]
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
 [ VERCEL CLOUD (Frontend) ]                       [ RAILWAY ENGINE (Backend) ]
 • Hosts Compiled static React app                  • Runs Node.js Express process
 • Globally distributed edge CDN                   • Listens on automatic dynamic Port
 • Auto-triggered Git updates                      • Exposed via personal .railway.app URL
           │                                                 │
           │ (JSON REST HTTP Traffic / CORS)                 │ (Internal network SQL)
           └────────────────► [ API Requests ] ◄─────────────┘
                                                             │
                                                             ▼
                                                   [ RAILWAY MYSQL DATABASE ]
                                                   • Fully managed database container
                                                   • Persistent cloud volume disk
```

---

## 💳 1. Understanding the Free Tiers (Prerequisites)

*   **Vercel (Frontend)**:
    *   **Cost**: **100% Free** (Hobby Plan).
    *   **Limits**: 100 GB bandwidth monthly, unlimited auto-triggered Github deployments.
*   **Railway (Backend + Database)**:
    *   **Cost**: **Free Starter Plan** (Provides $5.00 or 500 usage hours of execution credits every month).
    *   *Note*: To prevent crypto-miners, Railway requests a credit/debit card verification to unlock the free credits. You will not be charged a single penny unless you exceed your container resource limits.

---

## 🛠️ Step 2: Set up MySQL Database on Railway

1.  Log in to your **[Railway Dashboard](https://railway.app/)** using your GitHub account.
2.  Click **New Project** -> Select **Provision MySQL** (Alternatively, you can select **Provision PostgreSQL** since Postgres connects perfectly with pooled environments).
3.  Railway will instantly spin up a managed database instance on your project canvas.
4.  Click on the database card, navigate to the **Variables** tab, and copy your **connection credentials**:
    *   `MYSQL_URL` or `DATABASE_URL` (usually looks like `mysql://root:password@host:port/railway`)
    *   `MYSQLHOST`
    *   `MYSQLUSER`
    *   `MYSQLPASSWORD`
    *   `MYSQLPORT`
    *   `MYSQLDATABASE`

---

## 🚀 Step 3: Deploy the Backend on Railway

Because your project is a monorepo containing both the server code (`server.ts`, `server/`) and your React frontend (`src/`), you must tell Railway to **only compile the backend part**.

1.  On your Railway project canvas, click **New** -> **GitHub Repo** -> Select your VEGA project repository.
2.  Click the newly added service card, navigate to the **Settings** tab, and configure your **Deployment variables**:
    *   **Repo Subfolder**: (Leave empty if your server is at the root directory level, or enter your backend path if isolated).
    *   **Build Command**: Let's build and package our bundler output:
        ```bash
        npm run build
        ```
    *   **Start Command**: Start your compiled server file:
        ```bash
        node dist/server.cjs
        ```
3.  Go to the **Variables** tab on your Railway service and add these Production Environment Variables:
    *   `NODE_ENV` = `production`
    *   `PORT` = `3000` *(Railway automatically injects its dynamic container port into your server, so make sure your `server.ts` uses `process.env.PORT || 3000`)*.
    *   `DATABASE_URL` = *(Paste your production MySQL database URI copied from Step 2)*.
    *   `GEMINI_API_KEY` = *(Paste your actual Google Gemini API key)*.
    *   `JWT_SECRET` = *(Add a random secure key to sign login tokens)*.
    *   `CLIENT_URL` = *(We will paste your Vercel public site link here in Step 4)*.
4.  Go to the **Networking** tab of your service, click **Generate Domain**, and copy the resulting URL (e.g., `https://vega-api-production.up.railway.app`). **This is your permanent backend API endpoint!**

---

## 🌐 Step 4: Deploy the Frontend on Vercel

Vercel is highly optimized for React/Vite builds.

1.  Log in to the **[Vercel Dashboard](https://vercel.com/)** and click **Add New** -> **Project**.
2.  Import your VEGA GitHub repository.
3.  Configure these **Build & Development Settings**:
    *   **Framework Preset**: Select **Vite** (Vercel automatically detects Vite configurations).
    *   **Build Command**: `npm run build` (This compiles React source into pure static CSS/JS files inside the `/dist` directory).
    *   **Output Directory**: `dist`
4.  Expand the **Environment Variables** section and insert these core settings:
    *   `VITE_API_URL` = *(Paste your permanent Railway backend API URL generated in Step 3, e.g., `https://vega-api-production.up.railway.app`)*.
    *   *(Tip: Make sure all your React Axios files load endpoints prefixing `import.meta.env.VITE_API_URL + "/api/"`)*.
5.  Click **Deploy**.
6.  Once deployed, copy your secure frontend website URL (e.g., `https://vega-client.vercel.app`).
7.  **Final Loop back (Anti-CORS Block Guard)**: Go back to your **Railway Backend Service variables** -> Update your variable `CLIENT_URL` with your exact live Vercel URL. This permits Cross-Origin credentials to login users seamlessly!

---

## 🛡️ Step 5: Critical Code Adjustments for Hybrid Deploy

To ensure your React client and Node server talk to each other across different domains (Vercel and Railway) without being blocked by CORS protection, update your server settings:

### Backend CORS Configuration in `server.ts`:
Configure CORS actively on your Express setup using your environment boundaries:

```typescript
import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL, // Your Vercel domain (e.g. https://vega-client.vercel.app)
  "http://localhost:5173", // Local dev client port
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Access blocked by CORS policy. domain not allowed."));
    }
  },
  credentials: true, // Enables exchange of JWT httpOnly secure cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// API routings...
```

---

## ⚖️ Database Strategy: Postgres vs MySQL on Railway
While you asked for MySQL, we highly suggest using **PostgreSQL** on Railway's workspace because:
1.  **Lower Memory Footprint**: PostgreSQL is exceptionally light in container states, allowing you to stay well within the Railway free tier limits.
2.  **PostgreSQL Native Pools**: Node's relational pooling libraries (e.g., `pg`, `Prisma`) are highly robust and scale cleanly to thousands of user slots.
3.  Both conform to identical setups on Railway dashboard, taking less than 1 minute to deploy!

---

## 🏆 Summary of Benefits:
*   🚀 **Performance**: Your interface loads in **sub-50ms** as Vercel caches it on physical Cloudflare servers globally close to the candidate.
*   💾 **Stability**: A heavy DB query on Railway won't slow down UI transitions since Vercel serves the page assets completely independently.
*   💸 **Zero Pricing**: You run a fully decoupled production micro-architecture that scales dynamically while utilizing 100% free credits to start.
