# Mafioso Game Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **AWS SAM CLI** - Required for running the backend locally
   - Installation guide: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
3. **Docker** - Required by SAM CLI for local Lambda emulation

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run both frontend and backend:
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Alternative: Frontend Only

If you want to run just the frontend without the backend:
```bash
npm run dev:frontend-only
```

Note: Without the backend running, API calls will fail with 404 errors.

## Troubleshooting

### "sam: command not found"
- Install AWS SAM CLI following the guide above
- Make sure it's added to your PATH

### API calls returning 404
- Ensure the backend is running on port 3000
- Check that the Vite proxy configuration is correct in `frontend/vite.config.ts`

### "worldfund" appearing instead of "mafioso"
- This was caused by npm finding a parent directory's package.json
- Now fixed with the root package.json we created