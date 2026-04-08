#!/usr/bin/env python3
"""
Check the API endpoint for papers without needing database connection
Run this after Docker is running
"""

import requests
import json

BASE_URL = "http://localhost:3000"

print("=" * 80)
print("CHECKING RESEARCH PAPERS VIA API")
print("=" * 80)

try:
    # Check if backend is running
    print("\n1. Checking if backend is running...")
    response = requests.get(f"{BASE_URL}/api/stories?limit=all&sort=score", timeout=5)
    
    if response.status_code == 200:
        all_stories = response.json()
        print(f"✅ Backend is running. Total stories: {len(all_stories)}")
        
        # Filter for arxiv
        arxiv_stories = [s for s in all_stories if (s.get('source') or '').lower() == 'arxiv']
        print(f"\n2. ArXiv Papers Found: {len(arxiv_stories)}")
        
        if arxiv_stories:
            print("\n   📋 ArXiv Papers:")
            for i, paper in enumerate(arxiv_stories[:5], 1):
                print(f"\n   {i}. {paper['title'][:60]}...")
                print(f"      ID: {paper['id']}")
                print(f"      Source: {paper.get('source')}")
                print(f"      Category: {paper.get('category')}")
                print(f"      Summary: {paper.get('summary', '')[:60]}...")
                print(f"      Tech Score: {paper.get('tech_score')}")
                print(f"      Analyzed: {paper.get('analyzed')}")
        else:
            print("\n   ❌ No ArXiv papers found")
            
            # Show what sources ARE available
            sources = {}
            for s in all_stories:
                src = s.get('source', 'Unknown')
                sources[src] = sources.get(src, 0) + 1
            
            print("\n   📍 Available sources:")
            for src, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
                print(f"      {src}: {count}")
        
        # Check for papers with deep analysis
        print("\n3. Checking for papers with deep analysis...")
        papers_with_analysis = [s for s in all_stories if (s.get('source') or '').lower() == 'arxiv' and s.get('analyzed')]
        print(f"   Papers with analysis: {len(papers_with_analysis)}")
        
        if papers_with_analysis:
            print("\n   📚 Papers with Deep Analysis:")
            for i, paper in enumerate(papers_with_analysis[:3], 1):
                print(f"\n   {i}. {paper['title'][:50]}...")
                print(f"      ID: {paper['id']}")
    else:
        print(f"❌ Backend returned status {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to backend at http://localhost:3000")
    print("   Make sure Docker containers are running:")
    print("   docker-compose up -d")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 80)
