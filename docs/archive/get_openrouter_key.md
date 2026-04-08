# Getting Fresh OpenRouter API Key

## Steps:
1. Go to: https://openrouter.ai
2. Click "Sign Up" or login
3. Navigate to "API Keys" in dashboard
4. Click "Create New Key"
5. Copy the key (starts with "sk-or-v1-")
6. Replace in .env file

## Key Format:
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxx

## Common Issues:
- Keys must start with "sk-or-v1-" prefix
- Free tier has daily/monthly limits
- Account may need verification

## Test Key:
After updating, restart backend:
docker-compose restart backend
