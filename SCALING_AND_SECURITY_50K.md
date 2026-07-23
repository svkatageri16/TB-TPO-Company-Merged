# Scaling & Securing VEGA for 50k+ Users

This document outlines the architecture, deployment strategy, and security measures required to successfully launch, scale, and secure this platform for a user base of 50,000+ active students and companies.

## 1. Can the Current Code Handle 50k+ Users?

**Short Answer:** No, not in its current state. The current codebase is a monolithic prototype built for rapid development and testing. 

**Why?**
1. **Database:** The project currently uses `SQLite` (a file-based local database). SQLite will lock the database file during simultaneous writes, causing severe bottlenecks and crashes with 50,000 users.
2. **File Storage:** Resumes and profile pictures are currently saved to a local `uploads/` folder. If you deploy this across multiple servers (which you must for 50k users), images uploaded to Server A won't be visible to users hitting Server B.
3. **Session State:** While JWT is mostly stateless, any local memory usage for rate limiting (currently using `express-rate-limit` in memory) will be wiped out or isolated per server.
4. **AI Rate Limits:** Processing 50k user resumes and psychometric tests through the free tier of the Gemini API will instantly result in `429 Too Many Requests` (Quota Exceeded) errors.

---

## 2. Infrastructure & Deployment Strategy (Where & How)

For 50k+ traffic, you need a high-availability cloud architecture.

### Recommended Cloud Provider: AWS, Google Cloud (GCP), or Azure
We recommend **Google Cloud Platform (GCP)** or **Amazon Web Services (AWS)** due to their managed services and auto-scaling.

### Target Architecture Structure:
1. **Frontend Hosting (CDN):** 
   - Compile the React frontend (`npm run build`) and host the static files on a global CDN like **AWS CloudFront + S3**, **Vercel**, **Cloudflare Pages**, or **GCP Cloud Storage**. Edge caching ensures the UI loads instantly worldwide.
2. **Backend API Servers (Compute):**
   - Containerize the Node.js Express backend using **Docker**.
   - Deploy using **AWS ECS (Elastic Container Service)**, **EKS (Kubernetes)**, or **Google Cloud Run**. These services will automatically spin up more servers (Auto-scaling) when traffic spikes and scale down when traffic drops.
3. **Database (Relational):**
   - Migrate from local SQLite to **managed PostgreSQL or MySQL**.
   - Use **AWS RDS Aurora** or **GCP Cloud SQL PostgeSQL**. They handle automated backups, replication, and connection pooling for thousands of concurrent connections.
4. **Blob Storage (Files):**
   - Store resumes, company logos, and profile images on **AWS S3** or **Google Cloud Storage**.
5. **Caching Layer:**
   - Implement **Redis (AWS ElastiCache)** to cache frequent database queries (like Job Listings, Public Profiles, and Rate Limits) to take the heavy load off your main database.

---

## 3. Code Modifications Required for Scaling

Before deploying, you MUST make these code changes:

### A. Migrate the Database Connections
Change the code in `server/db.ts` to strictly require your cloud database connection string.
```typescript
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL, 
  waitForConnections: true,
  connectionLimit: 100, // Handle high concurrency
  queueLimit: 0
});
```

### B. Shift to Cloud Storage (AWS S3)
Replace local `multer` file saves. Whenever a user uploads a PDF or Image, upload it directly to S3 and save the S3 URL to the database.
```bash
npm install aws-sdk multer-s3
```

### C. Implement Redis Rate Limiting
Modify `server.ts` to use a global Redis instance for rate limiting, rather than local memory. This synchronizes DDoS protection across all your active servers.

### D. Setup a Message Queue for AI Processing
When 1,000 students try to generate their resumes at the exact same minute, the Node server will freeze if it waits for the AI. 
- Implement **RabbitMQ** or **AWS SQS** or **Redis BullMQ**.
- Flow: User clicks "Generate Resume" -> Job enters Queue -> Server responds "Processing..." -> A separate Background Worker Server processes the AI requests at a controlled pace -> Pushes notification to frontend via WebSockets when done.

---

## 4. Security & Hardening (Preventing Hacks)

When you hit 50k users, you become a lucrative target for hackers. Here is how to secure the application:

### A. Network & Infrastructure Level Security
1. **WAF (Web Application Firewall):** Put your API and Frontend behind **Cloudflare** or **AWS WAF**. This blocks SQL Injection attempts, automated botnets, and DDoS attacks before they even reach your servers.
2. **Private VPC (Virtual Private Cloud):** Ensure your Database (RDS) and Redis instances are **NOT** exposed to the public internet. Only your backend compute servers should be able to communicate with the DB through internal IP routing.

### B. Application (Code) Level Security
1. **Strict Input Validation:** Never trust user input. Although you evaluate JSON, use a library like `Zod` or `Joi` on the backend to validate every single POST and PUT request. Ensure a user isn't sending a 5GB file to crash your server.
2. **SQL Injection Prevention:** You are already using parameterized queries (or an ORM/Query Builder). *Strictly review* the codebase to ensure no direct string concatenation is happening in SQL queries.
3. **Advanced Rate Limiting:** Apply stringent rules:
   - Login endpoints: Max 5 attempts per IP per 10 minutes.
   - AI endpoints: Max 10 attempts per User ID per day (prevents malicious scraping / burning your OpenAI/Gemini credits).
4. **XSS Protection:** Use `helmet()` middleware in your Express server. React inherently escapes strings preventing basic XSS, but ensure you never use `dangerouslySetInnerHTML` blindly with user-provided Markdown or descriptions.
5. **CORS (Cross-Origin Resource Sharing):** In `server.ts`, restrict CORS to exclusively your production frontend domain.
   ```typescript
   app.use(cors({ origin: 'https://www.yourdomain.com' }));
   ```

### C. Authentication & Authorization Security
1. **JWT Secret Splitting & Rotation:** Use RSA Key Pairs (RS256) for your JWT instead of simple symmetric strings (HS256). Rotate these keys periodically.
2. **Access Control (IDOR Prevention):** Ensure every endpoint verifies that the `User ID` trying to update a profile or delete an application actually *owns* that data.
   - *Example bug to prevent:* User A passing `{"profileId": 999}` (User B's profile) into a PUT request and taking over their account.

### D. File Upload Security
Hackers often upload `malicious_script.php` disguised as `hacker_resume.pdf`.
1. **Mime-Type & Magic Byte Validation:** Don't just check the file extension. Use libraries like `file-type` to read the first bytes of the file and confirm it is undeniably a true PDF or JPG.
2. **Size Limits:** Cap file uploads to 5MB.
3. **No Execution Permissions:** Ensure the S3 bucket housing the files does not have execution rights, and serve all files with `Content-Disposition: attachment` or strict Content Security Policies.

---

## 5. Development Workflow (CI/CD)

For a large-scale application, you should never deploy "manually".
Create a automated pipeline using **GitHub Actions**, **GitLab CI**, or **Bitbucket Pipelines**.

1. **Commit Code** to the `main` branch.
2. **Automated Testing:** Pipeline automatically runs integration tests, unit tests, and security scans (SAST tooling like SonarQube or Snyk).
3. **Build:** Pipeline builds the Docker Image.
4. **Deploy:** Pipeline pushes the image to a container registry and automates a zero-downtime rolling update to your cluster.

*Follow these phases systematically, and your platform will securely handle extensive scale without faltering.*
