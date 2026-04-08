import requests

r = requests.get('http://localhost:5000/api/stories?limit=all&sort=score')
data = r.json()

# Filter for arxiv - same logic as frontend
arxiv_papers = [s for s in data if (s.get('source') or '').lower().strip() == 'arxiv' or 'arxiv' in (s.get('source') or '').lower().strip()]

print(f"Total stories: {len(data)}")
print(f"ArXiv papers found: {len(arxiv_papers)}")

# Also check different cases
sources = {}
for s in data:
    source = (s.get('source') or '').lower().strip()
    if source not in sources:
        sources[source] = 0
    sources[source] += 1

print("\nSource breakdown:")
for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f"  {source}: {count}")

# Check if there are any with arxiv in them
arxiv_containing = [s for s in data if 'arxiv' in (s.get('source') or '').lower()]
print(f"\nPapers with 'arxiv' in source: {len(arxiv_containing)}")

if arxiv_containing:
    print(f"First arxiv paper: {arxiv_containing[0]['title'][:100]}")
    print(f"Source: {arxiv_containing[0]['source']}")
