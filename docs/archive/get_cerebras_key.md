# Getting Fresh Cerebras API Key

## Steps:
1. Go to: https://console.cerebras.ai
2. Login with your email or Google/GitHub
3. Navigate to "API Keys" section
4. Click "Create New Key"
5. Copy the key from the dashboard
6. Replace in `.env` file

## Key Format:
CEREBRAS_API_KEY=your_cerebras_api_key_here

## Common Issues:
- Keys can expire if not used
- Free tier has usage limits
- Make sure you copied the new key exactly

## Test Key:
After updating, restart backend:
docker-compose restart backend
