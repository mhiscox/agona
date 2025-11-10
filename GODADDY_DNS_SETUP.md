# GoDaddy DNS Setup for www.agona.ai

## Quick Setup Steps

### 1. Log into GoDaddy
- Go to: https://dcc.godaddy.com/
- Sign in to your account

### 2. Navigate to DNS Management
- Click "My Products"
- Find your `agona.ai` domain
- Click "DNS" or "Manage DNS"

### 3. Add DNS Records

You need to add **ONE** of these options:

#### Option A: CNAME for www (Recommended)
Add this CNAME record:

```
Type:    CNAME
Name:    www
Value:   cname.vercel-dns.com
TTL:     600 (or 1 hour)
```

#### Option B: A Record for Root Domain (if you want agona.ai to work too)
Add this A record:

```
Type:    A
Name:    @ (or leave blank)
Value:   76.76.21.21
TTL:     600 (or 1 hour)
```

### 4. Save and Wait
- Click "Save" after adding the record(s)
- Wait 15-30 minutes for DNS propagation (can take up to 48 hours)

## Verify It's Working

### Check DNS Propagation
1. Go to: https://dnschecker.org/
2. Enter: `www.agona.ai`
3. Select: `CNAME` record type
4. Check if it shows `cname.vercel-dns.com`

### Test the Domain
After DNS propagates (15-30 min), test:
```
https://www.agona.ai
```

## Troubleshooting

### Still Getting 404?
1. **Wait longer** - DNS can take up to 48 hours
2. **Verify the record** - Double-check the CNAME value is exactly `cname.vercel-dns.com`
3. **Check Vercel** - Go to Vercel Dashboard → Settings → Domains → Verify it shows "Valid Configuration"
4. **Clear DNS cache** - Run: `ipconfig /flushdns` (Windows)

### Domain Not Found in GoDaddy?
- Make sure you're logged into the correct GoDaddy account
- Check if the domain is registered with GoDaddy or another registrar

## Current Status
✅ Domain configured in Vercel: `www.agona.ai`
✅ Project linked: `agona`
⏳ Waiting for: DNS records in GoDaddy

## Quick Reference

**CNAME Record for www:**
- Name: `www`
- Value: `cname.vercel-dns.com`

**A Record for root (optional):**
- Name: `@`
- Value: `76.76.21.21`

