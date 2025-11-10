# Setting www.agona.ai as Primary Domain

## Step 1: Set Primary Domain in Vercel Dashboard

**⚠️ This must be done in the Vercel web dashboard, not via CLI:**

1. Go to: https://vercel.com/marco-hiscoxs-projects/agona/settings/domains
2. Find `www.agona.ai` in the domains list
3. Click the **three dots (⋯)** next to `www.agona.ai`
4. Select **"Set as Primary Domain"**
5. Confirm the change

This ensures `www.agona.ai` is the main domain for your project.

## Step 2: Verify DNS in Cloudflare

**Go to Cloudflare Dashboard:**
1. https://dash.cloudflare.com/
2. Select domain: `agona.ai`
3. Go to **DNS** section

**Verify/Add CNAME Record:**
```
Type:    CNAME
Name:    www
Target:  cname.vercel-dns.com
Proxy:   DNS only (GRAY cloud) ⚠️ CRITICAL
TTL:     Auto
```

**⚠️ MUST be gray cloud (DNS only), NOT orange (Proxied)**

If you see an orange cloud:
- Click the record
- Click the orange cloud to toggle to gray
- Save

## Step 3: Optional - Redirect Apex Domain

You have two options to redirect `agona.ai` → `https://www.agona.ai`:

### Option A: Redirect in Vercel (Recommended)

1. Go to: https://vercel.com/marco-hiscoxs-projects/agona/settings/domains
2. Add domain: `agona.ai` (apex domain)
3. Vercel will show you DNS records to add
4. In Vercel, go to **Settings → Redirects**
5. Add redirect rule:
   ```
   Source: agona.ai
   Destination: https://www.agona.ai
   Status Code: 308 (Permanent Redirect)
   ```

### Option B: Redirect in Cloudflare (Page Rules)

1. Go to Cloudflare → `agona.ai` → **Rules** → **Page Rules**
2. Create rule:
   ```
   URL: agona.ai/*
   Setting: Forwarding URL
   Status Code: 301
   Destination: https://www.agona.ai/$1
   ```

### Option C: Redirect in next.config.mjs (Already configured)

The redirect is already configured in `next.config.mjs` via the `redirects()` function.

## Step 4: Redeploy/Promote Latest Deployment

After setting primary domain and DNS:

```bash
# Redeploy to ensure everything is synced
vercel deploy --prod
```

Or promote the latest working deployment:
1. Go to Vercel Dashboard → Deployments
2. Find the latest successful deployment
3. Click **"..."** → **"Promote to Production"**

## Verify Everything Works

After DNS propagates (5-15 minutes):

1. **Test www domain:**
   ```
   https://www.agona.ai
   ```

2. **Test apex redirect (if configured):**
   ```
   https://agona.ai
   ```
   Should redirect to `https://www.agona.ai`

3. **Test API endpoints:**
   ```
   https://www.agona.ai/api/health
   https://www.agona.ai/api/query?prompt=test
   ```

## Current Status Checklist

- [ ] Set `www.agona.ai` as primary in Vercel Dashboard
- [ ] CNAME record in Cloudflare: `www` → `cname.vercel-dns.com` (gray cloud)
- [ ] Apex redirect configured (Vercel, Cloudflare, or next.config.mjs)
- [ ] Redeployed/promoted latest deployment
- [ ] Tested www.agona.ai works
- [ ] Tested apex redirect works (if configured)

## Troubleshooting

### Still Getting 404 on www.agona.ai
1. **Check DNS propagation:** https://dnschecker.org/
2. **Verify Cloudflare proxy is OFF** (gray cloud)
3. **Wait 15-30 minutes** for DNS to fully propagate
4. **Clear DNS cache:** `ipconfig /flushdns` (Windows)

### Primary Domain Not Setting
- Must be done in Vercel Dashboard, not CLI
- Domain must be verified first
- Wait a few minutes after setting

### Apex Redirect Not Working
- Check redirect configuration in Vercel Settings → Redirects
- Or verify Cloudflare Page Rule is active
- Or check next.config.mjs redirects function

