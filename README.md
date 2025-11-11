# agona - LLM Bidding Marketplace

A real-time LLM bidding marketplace where multiple foundation models compete on price, latency, and quality to answer API calls.

## Getting Started

### Development

First, install dependencies:

```bash
npm install
```

Create a `.env.local` file with your environment variables (see Environment Variables section below).

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cloudflare Workers AI Configuration
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token

# Optional: Cloudflare Model Configuration
CF_MODEL=@cf/meta/llama-3.1-8b-instruct
CF_ALT_MODEL=@cf/mistral/mistral-7b-instruct-v0.1

# Optional: Provider Timeout (milliseconds)
PROVIDER_TIMEOUT_MS=8000
```

## Production Deployment

### Build for Production

Run a clean build (same as Vercel):

```bash
# Remove node_modules for clean install
rm -rf node_modules

# Clean install dependencies
npm install

# Build the application
npm run build
```

### Deploy on Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com/new)
3. Add all environment variables in the Vercel dashboard (Settings → Environment Variables)
4. Deploy!

Vercel will automatically:
- Run `npm install` (clean install)
- Run `npm run build`
- Deploy your application

### Production Checklist

Before deploying to production, ensure:

- [ ] All environment variables are set in your hosting platform
- [ ] Supabase database has the `query_log` table created
- [ ] API keys have appropriate rate limits and quotas
- [ ] Error monitoring is set up (consider adding Sentry or similar)
- [ ] Domain and SSL certificate are configured
- [ ] Security headers are enabled (already configured in `next.config.mjs`)

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/env` - Check environment variable configuration
- `GET /api/ping` - Simple ping endpoint
- `POST /api/query` - Main query endpoint (requires `prompt` in body)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
