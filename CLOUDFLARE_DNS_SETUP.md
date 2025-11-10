# Cloudflare DNS Setup for www.agona.ai

## Quick Setup Steps

### 1. Log into Cloudflare
- Go to: https://dash.cloudflare.com/
- Sign in to your account

### 2. Select Your Domain
- Find and click on `agona.ai` in your Cloudflare dashboard

### 3. Go to DNS Settings
- Click on **"DNS"** in the left sidebar
- Or go to: https://dash.cloudflare.com → Select `agona.ai` → DNS

### 4. Add DNS Records

You need to add **ONE** of these options:

#### Option A: CNAME for www (Recommended)
Click **"Add record"** and add:

```
Type:    CNAME
Name:    www
Target:  cname.vercel-dns.com
Proxy status:  DNS only (gray cloud) ⚠️ IMPORTANT
TTL:     Auto
```

**⚠️ IMPORTANT:** Make sure the proxy status is **"DNS only"** (gray cloud icon), NOT "Proxied" (orange cloud). Vercel needs direct DNS, not Cloudflare proxy.

#### Option B: A Record for Root Domain (if you want agona.ai to work too)
Click **"Add record"** and add:

```
Type:    A
Name:    @ (or agona.ai)
IPv4 address:  76.76.21.21
Proxy status:  DNS only (gray cloud) ⚠️ IMPORTANT
TTL:     Auto
```

### 5. Save and Wait
- Click **"Save"** after adding the record
- Wait 5-15 minutes for DNS propagation (Cloudflare is usually faster)

## Verify It's Working

### Check DNS in Cloudflare
1. Go back to DNS settings
2. Verify the record shows:
   - Type: CNAME
   - Name: www
   - Target: cname.vercel-dns.com
   - Status: DNS only (gray cloud) ✅

### Check DNS Propagation
1. Go to: https://dnschecker.org/
2. Enter: `www.agona.ai`
3. Select: `CNAME` record type
4. Check if it shows `cname.vercel-dns.com`

### Test the Domain
After DNS propagates (5-15 min), test:
```
https://www.agona.ai
```

## ⚠️ Critical: Proxy Status

**MUST be "DNS only" (gray cloud)**, NOT "Proxied" (orange cloud)

- ✅ **Gray cloud (DNS only)** = Works with Vercel
- ❌ **Orange cloud (Proxied)** = Will cause 404 errors

If you see an orange cloud:
1. Click on the record
2. Click the orange cloud icon to toggle it to gray
3. Save

## Troubleshooting

### Still Getting 404?
1. **Check proxy status** - Must be gray cloud (DNS only)
2. **Wait a bit longer** - Even with Cloudflare, can take 5-15 minutes
3. **Verify the record** - Target should be exactly `cname.vercel-dns.com`
4. **Check Vercel** - Go to Vercel Dashboard → Settings → Domains → Verify it shows "Valid Configuration"
5. **Clear DNS cache** - Run: `ipconfig /flushdns` (Windows)

### Domain Not Found in Cloudflare?
- Make sure you're logged into the correct Cloudflare account
- Check if the domain was added to Cloudflare
- Verify nameservers are pointing to Cloudflare

## Current Status
✅ Domain configured in Vercel: `www.agona.ai`
✅ Project linked: `agona`
✅ Nameservers: Cloudflare (clark.ns.cloudflare.com, emerie.ns.cloudflare.com)
⏳ Waiting for: DNS record in Cloudflare

## Quick Reference

**CNAME Record for www:**
- Type: `CNAME`
- Name: `www`
- Target: `cname.vercel-dns.com`
- Proxy: **DNS only (gray cloud)** ⚠️

**A Record for root (optional):**
- Type: `A`
- Name: `@`
- IPv4: `76.76.21.21`
- Proxy: **DNS only (gray cloud)** ⚠️

