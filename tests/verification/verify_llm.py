import sys
import os
sys.path.append(os.getcwd())

# Mock settings if needed, but we want to test actual config loading
from backend.llm import get_llm_client
from backend.config import settings

def test_router():
    print(f"Testing LLM Router with provider: {settings.LLM_PROVIDER}")
    try:
        client = get_llm_client()
        print(f"Client: {client}")
        # Verify it has a generate method
        if hasattr(client, 'generate'):
            print("Success: Router has generate() method.")
        else:
            print("Error: Router missing generate() method.")
    except Exception as e:
        print(f"Error during initialization: {e}")

if __name__ == "__main__":
    test_router()
