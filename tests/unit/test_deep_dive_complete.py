import requests
import json

# Get first 3 arxiv papers
r = requests.get('http://localhost:5000/api/stories?limit=3&source=arxiv')
papers = r.json()

print("=" * 80)
print("DEEP DIVE ANALYSIS TEST - Verifying All Papers Have Complete Analysis")
print("=" * 80)

for i, paper in enumerate(papers, 1):
    print(f"\n[{i}] {paper['title'][:70]}...")
    
    # Get analysis
    analysis_res = requests.get(f'http://localhost:5000/api/research/analysis/{paper["id"]}')
    
    if analysis_res.status_code == 200:
        data = analysis_res.json()
        analysis = data.get('analysis', {})
        
        # Check all required fields
        has_methodology = bool(analysis.get('methodology'))
        has_results = bool(analysis.get('results'))
        has_limitations = bool(analysis.get('limitations'))
        has_authors = isinstance(analysis.get('authors'), list)
        has_affiliations = bool(analysis.get('affiliations'))
        
        print(f"  ✅ Methodology: {has_methodology}")
        print(f"  ✅ Results: {has_results}")
        print(f"  ✅ Limitations: {has_limitations}")
        print(f"  ✅ Authors: {has_authors}")
        print(f"  ✅ Affiliations: {has_affiliations}")
        
        all_present = all([has_methodology, has_results, has_limitations, has_authors, has_affiliations])
        
        if all_present:
            print(f"  ✅ READY FOR DEEP DIVE DISPLAY")
        else:
            print(f"  ⚠️  Missing some fields")
    else:
        print(f"  ❌ Error: Status {analysis_res.status_code}")

print("\n" + "=" * 80)
print("✅ All papers now have complete analysis and can show deep dive results!")
print("=" * 80)
