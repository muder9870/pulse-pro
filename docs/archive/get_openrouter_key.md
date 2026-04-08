# Getting Fresh OpenRouter API Key

## Steps:
1. Go to: https://openrouter.ai
2. Click "Sign Up" or login
3. Navigate to "API Keys" in dashboard
4. Click "Create New Key"
5. Copy the key from the dashboard
6. Replace in `.env` file

## Key Format:
OPENROUTER_API_KEY=your_openrouter_api_key_here

## Common Issues:
- Make sure you copied the new key exactly
- Free tier has daily/monthly limits
- Account may need verification

## Test Key:
After updating, restart backend:
docker-compose restart backend
