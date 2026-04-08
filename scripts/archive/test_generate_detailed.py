#!/usr/bin/env python3
"""Test generate endpoint with detailed error reporting"""

import requests
import json

BASE_URL = "http://localhost:5000"

print("Testing /api/generate endpoint...")
print(f"Article ID: 477")
print(f"Platform: twitter\n")

try:
    response = requests.post(
        f"{BASE_URL}/api/generate",
        json={"article_id": 477, "platform": "twitter"},
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}\n")
    
    try:
        data = response.json()
        print(f"Response JSON:")
        print(json.dumps(data, indent=2))
    except:
        print(f"Response Text:")
        print(response.text)
        
except Exception as e:
    print(f"Request failed: {type(e).__name__}: {e}")
