import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_monetization_links():
    print("\nTesting Monetization Links...")
    # Add a link
    payload = {"keyword": "Ollama", "url": "https://ollama.com/ref=ai-pulse"}
    res = requests.post(f"{BASE_URL}/monetization/links", json=payload)
    print(f"POST /monetization/links: {res.status_code}")
    print(res.json())

    # Get links
    res = requests.get(f"{BASE_URL}/monetization/links")
    print(f"GET /monetization/links: {res.status_code}")
    links = res.json()
    print(links)
    
    # Delete link
    if links:
        link_id = links[0]["id"]
        res = requests.delete(f"{BASE_URL}/monetization/links/{link_id}")
        print(f"DELETE /monetization/links/{link_id}: {res.status_code}")

def test_webhooks():
    print("\nTesting Webhooks...")
    # Add a webhook
    payload = {"name": "Test Hook", "url": "https://httpbin.org/post", "events": "pipeline_complete,test_event"}
    res = requests.post(f"{BASE_URL}/integrations/webhooks", json=payload)
    print(f"POST /integrations/webhooks: {res.status_code}")
    webhook = res.json().get("webhook", {})
    print(webhook)

    # Get webhooks
    res = requests.get(f"{BASE_URL}/integrations/webhooks")
    print(f"GET /integrations/webhooks: {res.status_code}")
    print(res.json())

    # Test trigger
    res = requests.post(f"{BASE_URL}/integrations/test")
    print(f"POST /integrations/test: {res.status_code}")
    print(res.json())

    # Delete webhook
    if webhook:
        webhook_id = webhook["id"]
        res = requests.delete(f"{BASE_URL}/integrations/webhooks/{webhook_id}")
        print(f"DELETE /integrations/webhooks/{webhook_id}: {res.status_code}")

if __name__ == "__main__":
    try:
        test_monetization_links()
        test_webhooks()
        print("\nAll Phase 9 API tests completed.")
    except Exception as e:
        print(f"\nTests failed: {e}")
