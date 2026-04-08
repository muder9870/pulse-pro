import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_hashtag_stats():
    print("Testing Hashtag Statistics...")
    # Trigger hashtag update
    resp = requests.post(f"{BASE_URL}/api/hashtags/update")
    print(f"Update response: {resp.status_code}")
    
    # Check metrics
    resp = requests.get(f"{BASE_URL}/api/analytics/full-summary")
    data = resp.json()
    stats = data.get("hashtag_stats", [])
    print(f"Hashtag Stats found: {len(stats)}")
    if stats:
        print(f"First stat entry: {stats[0]}")
    return len(stats) > 0

def test_platform_roi():
    print("\nTesting Platform ROI...")
    # Check summary
    resp = requests.get(f"{BASE_URL}/api/analytics/full-summary")
    data = resp.json()
    roi = data.get("platform_roi", [])
    print(f"Platform ROI entries found: {len(roi)}")
    if roi:
        print(f"First ROI entry: {roi[0]}")
    return len(roi) > 0

def test_batch_export():
    print("\nTesting Batch Export...")
    # Get some article IDs
    resp = requests.get(f"{BASE_URL}/api/stories")
    stories = resp.json()
    if not stories:
        print("No stories found for export test")
        return False
    
    ids = [s["id"] for s in stories[:3]]
    print(f"Exporting articles: {ids}")
    
    resp = requests.post(f"{BASE_URL}/api/export/batch", json={"article_ids": ids})
    if resp.status_code == 200:
        data = resp.json()
        print(f"Export Success! Markdown length: {len(data['markdown'])}")
        print(f"Articles exported: {data['count']}")
        return data["count"] > 0
    else:
        print(f"Export Failed: {resp.text}")
        return False

if __name__ == "__main__":
    h_ok = test_hashtag_stats()
    r_ok = test_platform_roi()
    b_ok = test_batch_export()
    
    if h_ok and r_ok and b_ok:
        print("\nALL ADVANCED FEATURES VERIFIED SUCCESSFULLY!")
    else:
        print("\nSOME VERIFICATIONS FAILED.")
