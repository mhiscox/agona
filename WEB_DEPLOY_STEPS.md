# Deploy to Vercel via Web Interface - Step by Step

## 🚀 Quick Steps (2-3 minutes)

### Step 1: Go to Vercel
Open: **https://vercel.com/new**

### Step 2: Sign In / Sign Up
- If you don't have an account, sign up with GitHub (recommended)
- This connects your GitHub account automatically

### Step 3: Import Repository
1. Click **"Import Git Repository"**
2. You'll see your GitHub repositories listed
3. Find and click on **`mhiscox/agona`**
4. Click **"Import"**

### Step 4: Configure Project (Quick Setup)
1. **Project Name:** Keep default (`agona`) or change it
2. **Framework Preset:** Should auto-detect "Next.js" ✅
3. **Root Directory:** Leave as `./` (default)
4. **Build Command:** Leave as `npm run build` (auto-detected) ✅
5. **Output Directory:** Leave as `.next` (auto-detected) ✅
6. **Install Command:** Leave as `npm install` (auto-detected) ✅

### Step 5: Deploy (Skip Environment Variables for Now)
- **Click "Deploy"** button at the bottom
- You can add environment variables later in Settings
- Deployment will start immediately

### Step 6: Get Your URL
- Wait 1-2 minutes for build to complete
- You'll see: **"Congratulations! Your project has been deployed"**
- Your URL will be: `https://agona-xxxxx.vercel.app` or `https://agona.vercel.app`
- **Copy this URL** - this is your MVP URL for the incubator!

## ✅ Test Your Deployment

Once deployed, test these URLs:

1. **Main Page:**
   ```
   https://your-project.vercel.app
   ```

2. **Health Check (should work immediately):**
   ```
   https://your-project.vercel.app/api/health
   ```
   Should return: `{"ok":true,"service":"health",...}`

3. **Environment Check:**
   ```
   https://your-project.vercel.app/api/env
   ```
   Shows which services are configured

## 🔧 Add Environment Variables Later (Optional)

After deployment, to make `/api/query` fully functional:

1. Go to your project dashboard on Vercel
2. Click **Settings** → **Environment Variables**
3. Add these variables:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CF_ACCOUNT_ID`
   - `CF_API_TOKEN`
4. Click **Redeploy** (or it will auto-redeploy)

## 📝 For Your Incubator Demo

**Your MVP URL:** `https://your-project.vercel.app`

You can show:
- ✅ Live, working Next.js application
- ✅ Health check endpoint
- ✅ Clean, professional deployment
- ✅ Ready for production (just needs API keys)

The site will work immediately - the query API will need environment variables, but the rest of the app is fully functional!

