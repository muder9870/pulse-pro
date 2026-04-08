import requests
import time

def verify_deep_dive():
    url = "http://localhost:5000/api/research/deep-dive"
    payload = {"article_id": 46}
    
    print(f"Triggering deep dive for article 10...")
    try:
        # Long timeout for LLM analysis
        response = requests.post(url, json=payload, timeout=120)
        if response.status_code == 200:
            print("Success! Response:")
            print(response.json())
        else:
            print(f"Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Give server time to start
    time.sleep(5)
    verify_deep_dive()
