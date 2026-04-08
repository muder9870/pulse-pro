import requests

# Get a few arxiv papers to see what fields are available
r = requests.get('http://localhost:5000/api/stories?limit=3&source=arxiv')
papers = r.json()

if papers:
    paper = papers[0]
    print("Available fields in story object:")
    for key in sorted(paper.keys()):
        value = paper[key]
        if isinstance(value, list):
            print(f"  {key}: (list with {len(value)} items)")
        elif isinstance(value, dict):
            print(f"  {key}: (dict)")
        else:
            print(f"  {key}: {value}")
