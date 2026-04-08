import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_media_features():
    print("\nTesting Media Features (Phase 10)...")
    
    # 1. Get stories to find a valid article_id
    res = requests.get(f"{BASE_URL}/stories?limit=1")
    stories = res.json()
    if not stories:
        print("No stories found. Please run the pipeline first.")
        return
    
    article_id = stories[0]["id"]
    print(f"Using Article ID: {article_id}")

    # 2. Test Image Generation
    print("\nTesting Image Generation...")
    payload = {
        "article_id": article_id,
        "prompt": "A futuristic city powered by AI, digital art style"
    }
    res = requests.post(f"{BASE_URL}/media/generate-image", json=payload)
    print(f"POST /api/media/generate-image: {res.status_code}")
    print(res.json())

    # 3. Test Video Script Generation
    print("\nTesting Video Script Generation (TikTok)...")
    payload = {
        "article_id": article_id,
        "platform": "tiktok"
    }
    res = requests.post(f"{BASE_URL}/media/generate-video-script", json=payload)
    print(f"POST /api/media/generate-video-script: {res.status_code}")
    if res.status_code == 200:
        script_data = res.json()
        print(json.dumps(script_data, indent=2))
    else:
        print(res.text)

    # 4. Test Asset Retrieval
    print("\nTesting Asset Retrieval for Article...")
    res = requests.get(f"{BASE_URL}/media/assets/{article_id}")
    print(f"GET /api/media/assets/{article_id}: {res.status_code}")
    print(res.json())

    # 5. Test All Assets Retrieval
    print("\nTesting All Assets Retrieval...")
    res = requests.get(f"{BASE_URL}/media/assets/all")
    print(f"GET /api/media/assets/all: {res.status_code}")
    assets = res.json().get("assets", [])
    print(f"Total assets found: {len(assets)}")

if __name__ == "__main__":
    try:
        test_media_features()
        print("\nPhase 10 verification completed successfully.")
    except Exception as e:
        print(f"\nVerification failed: {e}")
