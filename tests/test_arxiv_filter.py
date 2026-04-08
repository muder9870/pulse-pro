import requests

# Test with source filter
r = requests.get('http://localhost:5000/api/stories?limit=100&source=arxiv')
data = r.json()

print(f"With source=arxiv filter: {len(data)} papers")
if data:
    print(f"First paper: {data[0]['title'][:80]}")
    print(f"Source: {data[0]['source']}")
