# Quick Deploy Guide - Get Your MVP URL Fast

## Fastest Way: Vercel Web Interface (Recommended for Demo)

1. **Go to:** https://vercel.com/new
2. **Click:** "Import Git Repository"
3. **Select:** Your GitHub repo (`mhiscox/agona`)
4. **Click:** "Deploy" (you can add environment variables later)
5. **Get your URL:** Vercel will give you a URL like `agona.vercel.app`

**Time: ~2 minutes to get a live URL!**

## Alternative: Vercel CLI

```bash
vercel login
vercel
```

Follow the prompts. You'll get a URL immediately.

## For Incubator Demo

Your MVP will be live at: `https://your-project-name.vercel.app`

**Note:** The API endpoints will work, but you'll need to add environment variables for:
- OpenAI API calls
- Supabase database logging
- Cloudflare Workers AI

You can add these in Vercel Dashboard → Settings → Environment Variables after deployment.

## Quick Test URLs

Once deployed, test these endpoints:
- `https://your-url.vercel.app/api/health` - Should work immediately
- `https://your-url.vercel.app/api/env` - Shows which services are configured
- `https://your-url.vercel.app/api/query` - Needs environment variables

