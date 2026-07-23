# ☁️ AWS EC2 Free-Tier Step-by-Step Deployment Guide
## Deploying VEGA (React + Express Server + Postgres DB) on a Single t2.micro Instance

This comprehensive handbook provides an exact, step-by-step manual to deploying the **VEGA** platform on the **AWS EC2 Free Tier** (`t2.micro` or `t3.micro` with 1GB of RAM, running Ubuntu 22.04 LTS).

Because a Free-Tier instance has limited memory (1GB RAM), running Node.js, compiling React assets with Vite, and hosting a PostgreSQL database simultaneously can easily trigger **Out Of Memory (OOM)** server crashes. This guide contains critical optimizations—such as **Virtual Swap Space**—to ensure stable, lightning-fast performance without spending a single penny.

---

## 🗺️ High-Level Service Mapping (Single Instance Architecture)

On our EC2 instance, requests are hosted and routed as follows:

```
                  [ PUBLIC WORKSPACE USER REQUESTS ]
                                  │
                                  ▼
                 [ AWS SECURITY GROUP (Ingress 80/443) ]
                                  │
                                  ▼
                    [ NGINX REVERSE PROXY / SSL ]
                     /                         \
                    /                           \
                   ▼                             ▼
        [ STATIC FRONTEND VITE ]         [ EXPRESS BACKEND ENGINE ]
       Compiled static distribution      Internal Node.js server (Port 3000)
       directory served over Port 80 /   Managed via PM2 background daemon
       443 directly via Nginx            
                                                 │
                                                 ▼
                                     [ PostgreSQL SERVER ]
                                     Natively running DB engine
```

---

## 📋 Phase 1: Launch and Configure Your EC2 Instance

1.  Log in to your **AWS Management Console** and navigate to the **EC2 Dashboard**.
2.  Click **Launch Instance** and configure these settings:
    *   **Name**: `VEGA-Production`
    *   **Amazon Machine Image (AMI)**: Select **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type** (Eligible for Free Tier).
    *   **Instance Type**: Select **t2.micro** (or `t3.micro` if available in your AWS region, both fall under 750 free hours monthly).
    *   **Key Pair**: Click *Create new key pair*, select **RSA / .pem**, download it as `vega-key.pem`. Move this file safely to your system.
3.  **Network Settings (Security Group)**:
    *   Check `Allow SSH traffic from Anywhwere (0.0.0.0/0)` (or restrict to your personal IP for maximum security).
    *   Check `Allow HTTP traffic from the internet`.
    *   Check `Allow HTTPS traffic from the internet`.
    *   *Optional Developer Port*: Click *Add security group rule* and add a **Custom TCP Rule** allowing ingress Port `3000` from `0.0.0.0/0` (useful to test early before registering domains, but not required).

---

## 🔑 Phase 2: Establish Secure Connection & Configure SWAP Space

1.  Keep your downloaded `vega-key.pem` secure and configure your local terminal access permissions:
    ```bash
    chmod 400 vega-key.pem
    ```
2.  Log in to your Ubuntu instance via SSH (Find your public IP from your EC2 Instance table):
    ```bash
    ssh -i "vega-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
    ```
3.  **CRITICAL OPTIMIZATION: Setup a 2GB Virtual SWAP Space.** Run these commands immediately. Without this step, compilation steps like `npm run build` will freeze and crash your `t2.micro` node!
    ```bash
    # Allocate a 2GB physical file on disk
    sudo fallocate -l 2G /swapfile
    
    # Restrict permissions for security
    sudo chmod 600 /swapfile
    
    # Format the file to swap formatting
    sudo mkswap /swapfile
    
    # Enable the virtual memory file
    sudo swapon /swapfile
    
    # Make the swap partition persistent over server reboots
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    # Confirm it is working safely (shows partition metrics)
    free -h
    ```

---

## 🛠️ Phase 3: Install Runtimes (Node.js, Postgres, Nginx)

Update system libraries and establish the target production environments:

```bash
# 1. Update APT Package managers
sudo apt update && sudo apt upgrade -y

# 2. Install Git, Nginx web server, Node-gyp build tools, and Certbot
sudo apt install -y git nginx curl build-essential certbot python3-certbot-nginx

# 3. Download Node Version Manager (NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM variables into the active path
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node LTS (version 20)
nvm install 20
nvm use 20
nvm alias default 20

# Verify install balances
node -v && npm -v

# 4. Install PostgreSQL Server
sudo apt install -y postgresql postgresql-contrib

# Verify PostgreSQL is active and running cleanly
sudo systemctl status postgresql
```

---

## 🗄️ Phase 4: Configure the Production Database

Create your schema database, production users, and configure authorization permissions:

```bash
# 1. Enter the native Postgres command-line tool as administrative user
sudo -i -u postgres psql
```

Inside the `psql` command database shell, run your creation schema:
```sql
-- Create our dedicated production database
CREATE DATABASE vega;

-- Create our dedicated administrative user with a strong password
CREATE USER tb_admin WITH PASSWORD 'SetAStrongPasswordHere123!';

-- Grant user privileges on the newly provisioned database
GRANT ALL PRIVILEGES ON DATABASE vega TO tb_admin;

-- Connect to our database to prepare schema bindings
\c vega;

-- Grant standard public schema creation privileges
GRANT ALL ON SCHEMA public TO tb_admin;

-- Exit the Postgres command tools
\q
```

---

## 🚀 Phase 5: Clone, Configure, and Compile the Project

1. Clone your project repository on your EC2 instance:
   ```bash
   git clone <YOUR_GIT_REPOSITORY_URL> vega
   cd vega
   ```
2. Initialize production `.env` config file:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Add your production environments:
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Core Production Database URI (Pointing to your local Postgres)
   DATABASE_URL=postgresql://tb_admin:SetAStrongPasswordHere123!@localhost:5432/vega
   
   # Secrets Settings
   JWT_SECRET=SetAVeryLongRandomSecretTokenHere789!
   JWT_REFRESH_SECRET=SetAnotherLongSecretTokenHere456!
   
   # Core Integrations Keys
   GEMINI_API_KEY=AIzaSy...YourActualGeminiKeyHere
   ```
   *Press `Ctrl+O` and `Enter` to save, then `Ctrl+X` to exit nano.*

3. Install packages and compile static builds:
   ```bash
   # Install dependencies
   npm install
   
   # Build the frontend assets and compile Express server.ts with esbuild
   npm run build
   ```

---

## 🛡️ Phase 6: Keep Backend Running with PM2 Daemon

To prevent Node from stopping when your terminal closes, configure **PM2 (Process Manager 2)**:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Run database table builds or initializations before starting server
# If your app has custom migration scripts, run them: (e.g., node scripts/migrate.js)

# Start your compiled, bundled CommonJS server file, binding named process
pm2 start dist/server.cjs --name "vega-api"

# Configure PM2 to restart instantly if the server crashes or the instance boots up
pm2 startup systemd
```
AWS will prompt you to copy and execute an initialization path. Copy that command, paste it into the console, and hit enter.
```bash
# Save active process profiles
pm2 save
```

---

## 🌐 Phase 7: Configure Nginx as a Reverse Proxy

We must route public traffic on safe ports **80 (HTTP)** and **443 (HTTPS)** directly to Nginx. Nginx will serve the compiled static files instantly and reverse proxy all incoming requests to the Express server running on port 3000.

1.  Remove default active layout structures:
    ```bash
    sudo rm /etc/nginx/sites-enabled/default
    ```
2.  Create a custom config block:
    ```bash
    sudo nano /etc/nginx/sites-available/vega
    ```
3.  Paste this production server blueprint (Replace `<YOUR_DOMAIN_OR_EC2_IP>` with your public domain like `vega.co` or your EC2 Public DNS/IP address if testing natively):
    ```nginx
    server {
        listen 80;
        server_name <YOUR_DOMAIN_OR_EC2_IP>;

        # Max file payload limits (Required for resume uploads)
        client_max_body_type 10M;
        client_max_body_size 10M;

        # 1. API Endpoints - Reverse Proxy to Express Server
        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 2. Client Side static assets - Serve directly via Nginx
        location / {
            root /home/ubuntu/vega/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Enable static resource caching for 1M user speeds
        location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
            root /home/ubuntu/vega/dist;
            expires 1M;
            access_log off;
            add_header Cache-Control "public";
        }
    }
    ```
4.  Enable the Nginx config:
    ```bash
    sudo ln -s /etc/nginx/sites-available/vega /etc/nginx/sites-enabled/
    
    # Audit Nginx syntax structure
    sudo nginx -t
    
    # Reload and restart Nginx
    sudo systemctl restart nginx
    ```

---

## 🔒 Phase 8: Secure SSL with Let's Encrypt (HTTPS)

*(Note: Requires pointing a public registered DNS record to your EC2 instance IP).*

1.  Provision free auto-renewing SSL certificates instantly using Cerbot:
    ```bash
    sudo certbot --nginx -d <YOUR_DOMAIN_OR_SUBDOMAIN>
    ```
2.  Select options to automatically redirect HTTP traffic (`80`) to HTTPS (`443`) for bulletproof security.
3.  Verify the SSL setup auto-renew schedule:
    ```bash
    sudo certbot renew --dry-run
    ```

---

## 🏁 Phase 9: Health Verification & Debugging

Your system is now successfully deployed! Use these commands to inspect live server metrics:

```bash
# Check production API logs in real-time
pm2 logs vega-api

# Monitor active server RAM, CPU metrics, and PM2 instances
pm2 monit

# Review Nginx error logs if routes reject connections
sudo tail -f /var/log/nginx/error.log
```

*By implementing this optimized, virtual swap-partitioned model on a single AWS EC2 instance, you achieve an exceptionally functional production setup that is secure, scalable, and completely free of cost.*
