# Setting Up www.agona.ai Domain

## Current Status
✅ Domain `www.agona.ai` is configured in Vercel
✅ Domain is linked to your `agona` project
⚠️ DNS records need to be configured in GoDaddy

## Step-by-Step: Configure DNS in GoDaddy

### Option 1: Use Vercel's Nameservers (Recommended)

1. **Log into GoDaddy:**
   - Go to https://dcc.godaddy.com/
   - Sign in to your account

2. **Navigate to DNS Management:**
   - Go to "My Products"
   - Find `agona.ai` domain
   - Click "DNS" or "Manage DNS"

3. **Change Nameservers:**
   - Click "Change" next to Nameservers
   - Select "Custom" nameservers
   - Add Vercel nameservers (get them from Vercel dashboard):
     - Go to Vercel Dashboard → Your Project → Settings → Domains
     - Click on `www.agona.ai`
     - Copy the nameservers shown
   - Save changes

### Option 2: Keep GoDaddy Nameservers (Add DNS Records)

If you want to keep GoDaddy's nameservers, add these DNS records:

1. **Log into GoDaddy:**
   - Go to https://dcc.godaddy.com/
   - Navigate to DNS Management for `agona.ai`

2. **Add CNAME Record for www:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com` (or the value shown in Vercel dashboard)
   - TTL: `600` (or default)

3. **Add A Record for Root Domain (optional):**
   - Type: `A`
   - Name: `@` (or leave blank for root)
   - Value: `76.76.21.21` (Vercel's IP - check Vercel dashboard for current IP)
   - TTL: `600`

4. **Or Add A Record for Root to Redirect:**
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21` (Vercel's IP)

### Get Exact DNS Values from Vercel

1. **Via Vercel Dashboard:**
   - Go to: https://vercel.com/marco-hiscoxs-projects/agona/settings/domains
   - Click on `www.agona.ai`
   - You'll see the exact DNS records needed

2. **Via Vercel CLI:**
   ```bash
   vercel dns ls agona.ai
   ```

## Verify Configuration

After updating DNS:

1. **Wait for DNS Propagation:**
   - Can take 5 minutes to 48 hours
   - Usually takes 15-30 minutes

2. **Check DNS Propagation:**
   - Use: https://dnschecker.org/
   - Check for `www.agona.ai`
   - Look for CNAME pointing to Vercel

3. **Test the Domain:**
   ```bash
   # Test in browser
   https://www.agona.ai
   
   # Or test via command line
   Invoke-WebRequest -Uri "https://www.agona.ai" -UseBasicParsing
   ```

## Troubleshooting

### Domain Still Shows 404
- Wait longer for DNS propagation (up to 48 hours)
- Verify DNS records are correct in GoDaddy
- Check Vercel dashboard shows domain as "Valid Configuration"

### DNS Not Propagating
- Double-check nameservers or DNS records are correct
- Clear your DNS cache: `ipconfig /flushdns` (Windows)
- Try accessing from different network/device

### SSL Certificate Issues
- Vercel automatically provisions SSL certificates
- Wait 5-10 minutes after DNS is configured
- Check Vercel dashboard for SSL status

## Quick Check Commands

```bash
# Check domain status in Vercel
vercel domains inspect www.agona.ai

# List DNS records
vercel dns ls agona.ai

# Test domain
Invoke-WebRequest -Uri "https://www.agona.ai" -UseBasicParsing
```

