# 📊 VEGA — Comprehensive API & Infrastructure Costing Matrix
## Production-Grade Financial Modeling for High-Scale Operations

This document details the complete operating overhead, API consumption rates, cloud infrastructure resource allocations, and proxy costs for the **VEGA** platform. It provides a structured cost-projection model scaled incrementally for **1,000, 2,000, 5,000, 10,000, and 50,000 active monthly users (MAU)**.

---

## 🔍 1. Core Cost Categories & Pricing Assumptions

To establish an accurate projection, our financial models use current enterprise pricing sheets from **Google Cloud Platform (GCP)**, **Amazon Web Services (AWS)**, **Google GenAI (Gemini)**, and major rotating egress proxy providers.

### A. GenAI Cost Modeling (Gemini 3.5 Flash)
*Gemini 3.5 Flash* is highly optimized for performance and cost.

*   **Pricing Basis**:
    *   **Input Tokens**: $0.075 per 1 Million (1M) tokens.
    *   **Output Tokens**: $0.30 per 1 Million (1M) tokens.
*   **Average User Profile (Monthly Activity)**:
    1.  **AI Mock Interviews**: 3 sessions (each interview spans 15 rounds of dialog. Input context accumulates: Avg. 120,000 input tokens, 8,000 output tokens per interview = 360k Input, 24k Output).
    2.  **Resume Parsing & Optimization**: 2 builds (Avg. 15,000 input tokens, 5,000 output tokens = 30k Input, 10k Output).
    3.  **DSA Cognitive Profiler**: 2 diagnostic runs (Avg. 10,000 input tokens, 4,000 output tokens = 20k Input, 8k Output).
    4.  **AI Practice Quizzes**: 3 quizzes generated (Avg. 12,000 input tokens, 3,000 output tokens = 36k Input, 9k Output).
*   **Total Monthly Tokens per User**: **446,000 Input tokens** ($0.033) + **51,000 Output tokens** ($0.015) = **$0.048 per active user / month**.

### B. Competitive Code Scraping Proxies (Bright Data / ScrapingBee)
Scraping external developer platforms (LeetCode, Codeforces, HackerRank, CodeChef, GfG) synchronously requires residential or datacenter proxy rotating pools to avoid IP rate limits and coordinate requests.

*   **Pricing Basis**: Residential proxy bandwidth at **$3.00 per Gigabyte (GB)**.
*   **Average User Profile (Monthly Activity)**:
    *   **Sync frequency**: 6 on-demand refreshes per month.
    *   **Bandwidth consumption**: 1.5MB of raw HTML/JSON response payload transfer per refresh cycle = 9MB total per user monthly.
*   **Total Monthly Proxy Cost**: **$0.000027 per active user/month** (highly efficient when decoupled with Redis caching).

### C. Managed Cloud Hosting (AWS ECS / GCP Cloud Run Fargate)
*   **1,000 to 5,000 MAU**: Shared Docker container instances (0.5 vCPU, 1GB RAM) with automated cold starts.
*   **10,000 to 50,000 MAU**: High-Availability, multi-zone replicated containers (2-6 vCPUs, 4GB-12GB RAM) across target server nodes.

### D. Relational Database Cluster (Managed Cloud PostgreSQL)
*   **1,000 to 5,000 MAU**: Single-node DB Instance (2 vCPU, 4GB RAM, standard SSD).
*   **10,000 to 50,000 MAU**: Premium Primary-Replica Multi-AZ cluster with PgBouncer connection proxy nodes (4 vCPU, 16GB RAM, provisioned IOPS SSD).

### E. Managed Redis Cache & Queue (Enterprise ElastiCache / Redis Labs)
Required to manage background task execution via queues (BullMQ/RabbitMQ) and cache responses to avoid API billing.
*   **1,000 to 5,000 MAU**: Standard micro instance cluster (Shared, 1GB memory).
*   **10,000 to 50,000 MAU**: Managed Redis High-Availability replica cluster (3.2GB - 13GB memory).

---

## 📈 2. Complete Cost Projection Matrix

| Expense Item | 1,000 Active Users | 2,000 Active Users | 5,000 Active Users | 10,000 Active Users | 50,000 Active Users |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GenAI API (Gemini 3.5)** | $48.00 | $96.00 | $240.00 | $480.00 | $2,400.00 |
| **Rotating Scraping Proxies** | $0.03 | $0.06 | $0.15 | $0.30 | $1.50 |
| **Application Hosting (CPU)** | $15.00 | $30.00 | $60.00 | $120.00 | $450.00 |
| **Managed DB (Postgres)** | $45.00 | $45.00 | $90.00 | $180.00 | $420.00 |
| **Redis Cache / Queue** | $18.00 | $18.00 | $36.00 | $72.00 | $150.00 |
| **Object File Storage (S3)** | $3.50 | $7.00 | $17.50 | $35.00 | $175.00 |
| **Data Out & Networking / CDN**| $12.00 | $24.00 | $60.00 | $120.00 | $600.00 |
| **Transactional Email (SES)** | $0.20 | $0.40 | $1.00 | $2.00 | $10.00 |
| **TOTAL MONTHLY OVERHEAD** | **$141.73** | **$220.46** | **$504.65** | **$1,009.30** | **$4,206.50** |
| **Cost per Active User / Month** | **$0.14** | **$0.11** | **$0.10** | **$0.10** | **$0.08** |

---

## 🛠️ 3. Critical Financial Opt-in Guardrails (Keeping Costs Low)

As shown in the matrix above, economies of scale progressively reduce costs from **$0.14 per user/month down to just $0.08 per user/month**. To guarantee these projections in a production environment, implement these cost-control architectures:

### 💡 1. Cache Gemini Outlines Globally
AI content generation is the largest single expense on the platform (comprising >55% of overall costs).
*   **Optimization**: When generating Cognitive Quizzes (`src/pages/ai/QuizConfigPage.tsx`), compile and store standardized static question templates in Postgres. Only query Gemini to generate a quiz when a student requests a completely unique, non-cached topic. This reduces AI costs by up to 80%.

### 🔄 2. Aggressive CDN Integration
Statics headers, compiled React builds, and illustrations should bypass your cloud instances completely.
*   **Optimization**: Front all connections with **Cloudflare, AWS CloudFront, or Fastly**. Cloud CDN edge routing will handle 95% of incoming assets, cutting hosting container CPU usage and bandwidth bills significantly.

### 🛑 3. Hard Rate Limitations on AI Routes
An unauthenticated or malicious script looping the AI Mock Interview system would generate thousands of concurrent requests.
*   **Protection**: Bind strict monthly tokens or XP consumption requirements to trigger AI interviews, capped at a maximum of 4 mock interview sessions per candidate per week.

### ⏱️ 4. Idle Database Hibernation
*   **Optimization**: In development or early preview stagings, configure your server database cluster to scale down to zero node replication during quiet schedules (e.g., 2:00 AM to 6:00 AM local time) to eliminate idle container charges.
