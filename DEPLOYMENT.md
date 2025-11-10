# Vercel Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Prepare Your Code

Your code is already production-ready! The build has been tested and configured.

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `supabase-schema.sql` to create the `query_log` table
4. Verify the table was created in **Table Editor**

### 3. Deploy to Vercel

#### Option A: Deploy via GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/agona.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import" and select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   - In Vercel project settings, go to **Settings → Environment Variables**
   - Add all required variables:
     ```
     OPENAI_API_KEY=your_key_here
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     CF_ACCOUNT_ID=your_cloudflare_account_id
     CF_API_TOKEN=your_cloudflare_token
     CF_MODEL=@cf/meta/llama-3.1-8b-instruct
     CF_ALT_MODEL=@cf/mistral/mistral-7b-instruct-v0.1
     PROVIDER_TIMEOUT_MS=8000
     ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy

#### Option B: Deploy via Vercel CLI (No GitHub Required)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked about environment variables, you can add them via CLI or add them later in the dashboard

4. **Add Environment Variables:**
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add all required variables (see list above)

5. **Redeploy with environment variables:**
   ```bash
   vercel --prod
   ```

### 4. Configure GoDaddy Domain

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Add your GoDaddy domain (e.g., `yourdomain.com`)

2. **In GoDaddy DNS Settings:**
   - Add a CNAME record:
     - Type: `CNAME`
     - Name: `@` (or `www` for www subdomain)
     - Value: `cname.vercel-dns.com` (Vercel will show you the exact value)
   - Or add A records if Vercel provides IP addresses

3. **Wait for DNS propagation** (can take up to 48 hours, usually much faster)

### 5. Verify Deployment

1. **Check Health Endpoint:**
   - Visit: `https://yourdomain.com/api/health`
   - Should return: `{"ok":true,"service":"health",...}`

2. **Check Environment Variables:**
   - Visit: `https://yourdomain.com/api/env`
   - Should show which services are configured

3. **Test Query Endpoint:**
   - POST to `https://yourdomain.com/api/query`
   - Body: `{"prompt": "What is an LLM?"}`

## Post-Deployment Checklist

- [ ] All environment variables are set in Vercel
- [ ] Supabase `query_log` table is created
- [ ] Health endpoint returns OK
- [ ] Environment check endpoint shows all services configured
- [ ] Domain is connected and SSL certificate is active
- [ ] Test query endpoint works
- [ ] Check Vercel logs for any errors

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects, but you can set it in `package.json`)

### Environment Variables Not Working
- Ensure variables are added for "Production" environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Database Errors
- Verify Supabase credentials are correct
- Check that `query_log` table exists
- Ensure service role key has insert permissions

### Domain Not Working
- Wait for DNS propagation (up to 48 hours)
- Verify DNS records are correct in GoDaddy
- Check Vercel domain settings show "Valid Configuration"

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Supabase Docs: https://supabase.com/docs

