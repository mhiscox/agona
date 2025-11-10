# Demo Password Protection Setup

## Overview
The live demo on the homepage is now password protected. Only users with the correct password can access and use the interactive demo.

## Setup

### 1. Set Password in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new environment variable:
   ```
   Name:  DEMO_PASSWORD
   Value: your-secure-password-here
   ```
3. Select environment: **Production** (and Preview if needed)
4. Save

### 2. Share Password with YC Partners

Send them:
- The URL: `https://www.agona.ai`
- The password: `your-secure-password-here`

## How It Works

1. **Password Screen**: Users see a password input when they visit the homepage
2. **Authentication**: Password is verified server-side via `/api/demo-auth`
3. **Session Storage**: Once authenticated, the session persists in the browser (until they close the tab or click "Lock")
4. **Lock Button**: Authenticated users can lock the demo again using the "Lock" button

## Security Notes

- Password is stored in environment variable (not in code)
- Authentication happens server-side
- Session is stored in browser's sessionStorage (cleared when tab closes)
- If `DEMO_PASSWORD` is not set, demo is accessible to everyone (useful for development)

## For Development

If you want to disable password protection locally:
- Don't set `DEMO_PASSWORD` in your `.env.local`
- The demo will be accessible without a password

## Testing

1. Visit `https://www.agona.ai`
2. You should see the password prompt
3. Enter the password you set in Vercel
4. Demo should unlock and be usable
5. Click "Lock" to test locking again

