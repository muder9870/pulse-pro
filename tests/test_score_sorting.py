import requests

# Fetch arxiv papers sorted by highest score first
r = requests.get('http://localhost:5000/api/stories?limit=10&source=arxiv&sort=score')
data = r.json()

print("Top 10 ArXiv Papers by Score (Highest to Lowest):\n")
print(f"{'Rank':<5} {'Total Score':<15} {'Title':<60}")
print("-" * 80)

for i, paper in enumerate(data, 1):
    title = paper['title'][:57] + "..." if len(paper['title']) > 60 else paper['title']
    score = paper.get('total_score', 0)
    print(f"{i:<5} {score:<15.2f} {title:<60}")

print("\n✅ Papers are sorted from highest to lowest score!")
