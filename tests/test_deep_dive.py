import requests
import json

# Get first arxiv paper
r = requests.get('http://localhost:5000/api/stories?limit=1&source=arxiv')
papers = r.json()

if papers:
    paper = papers[0]
    print(f"Testing Deep Dive for: {paper['title'][:80]}")
    print(f"Article ID: {paper['id']}\n")
    
    # First, check if analysis exists
    check_res = requests.get(f'http://localhost:5000/api/research/analysis/{paper["id"]}')
    print(f"Check Analysis Status: {check_res.status_code}")
    print(f"Response: {json.dumps(check_res.json(), indent=2)}\n")
    
    # If 202 or error, trigger deep dive
    if check_res.status_code != 200:
        print("Triggering Deep Dive...")
        dive_res = requests.post('http://localhost:5000/api/research/deep-dive', 
                                 json={"article_id": paper["id"]})
        print(f"Deep Dive Response Status: {dive_res.status_code}")
        try:
            dive_data = dive_res.json()
            print(f"Deep Dive Response: {json.dumps(dive_data, indent=2)}")
        except:
            print(f"Failed to parse response: {dive_res.text[:500]}")
