# Getting Fresh Cerebras API Key

## Steps:
1. Go to: https://console.cerebras.ai
2. Login with your email or Google/GitHub
3. Navigate to "API Keys" section
4. Click "Create New Key"
5. Copy the key (starts with "csk-")
6. Replace in .env file

## Key Format:
CEREBRAS_API_KEY=csk-xxxxxxxxxxxxxxxxxxxxxxxxxxx

## Common Issues:
- Keys can expire if not used
- Free tier has usage limits
- Key must start with "csk-" prefix

## Test Key:
After updating, restart backend:
docker-compose restart backend
