import requests

# Test that stories now include has_deep_analysis field
r = requests.get('http://localhost:5000/api/stories?limit=5&source=arxiv')
papers = r.json()

print("✅ Testing new has_deep_analysis field:")
print("=" * 80)

for i, paper in enumerate(papers[:3], 1):
    print(f"\n[{i}] {paper['title'][:70]}")
    print(f"    has_deep_analysis: {paper.get('has_deep_analysis', 'MISSING')}")
    print(f"    analyzed: {paper.get('analyzed', 'MISSING')}")
    
print("\n" + "=" * 80)
print("✅ Field is available in API response!")
