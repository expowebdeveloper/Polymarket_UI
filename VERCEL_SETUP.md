# Vercel Deployment Setup

## Environment Variables

You need to set the following environment variable in your Vercel project settings:

### Required Environment Variable

**`VITE_BACKEND_API`** - Your backend API URL

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_BACKEND_API`
   - **Value**: Your backend API URL (e.g., `https://your-backend-api.vercel.app` or `https://your-backend.railway.app`)
   - **Environment**: Production, Preview, Development (select all)

### Example

If your backend is deployed at `https://polymarket-api.vercel.app`, set:
```
VITE_BACKEND_API=https://polymarket-api.vercel.app
```

### Important Notes

- The backend API must have CORS enabled to allow requests from your frontend domain
- Make sure your backend is deployed and accessible before setting this variable
- After adding the environment variable, you need to **redeploy** your Vercel project for the changes to take effect

## Troubleshooting

If you see errors like "Failed to load leaderboard" or requests going to the wrong URL:

1. Check that `VITE_BACKEND_API` is set correctly in Vercel
2. Verify your backend API is accessible and responding
3. Check browser console for CORS errors
4. Redeploy your frontend after setting environment variables


















