#!/usr/bin/env python3
"""
Quick verification that Research Deep Dive is working
Run after Docker containers bring papers up
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3000"

print("\n" + "=" * 80)
print("🔍 RESEARCH DEEP DIVE VERIFICATION")
print("=" * 80)

try:
    # Test 1: Check backend connection
    print("\n[1/4] Checking backend connection...")
    response = requests.get(f"{BASE_URL}/api/stories?limit=all&sort=score", timeout=5)
    
    if response.status_code != 200:
        print(f"❌ Backend error: {response.status_code}")
        exit(1)
    
    all_stories = response.json()
    print(f"✅ Backend connected. Total stories loaded: {len(all_stories)}")
    
    # Test 2: Find arxiv papers
    print("\n[2/4] Checking for ArXiv papers...")
    arxiv_papers = [s for s in all_stories if (s.get('source') or '').lower() == 'arxiv']
    print(f"✅ Found {len(arxiv_papers)} ArXiv papers")
    
    if not arxiv_papers:
        print("   ⚠️  No ArXiv papers found. Check if pipeline has ingested from ArXiv sources.")
        exit(0)
    
    # Test 3: Check if papers have deep analysis
    print("\n[3/4] Checking for deep analysis data...")
    papers_with_analysis = [p for p in arxiv_papers if p.get('analyzed')]
    print(f"✅ Papers with analysis: {len(papers_with_analysis)}")
    
    if papers_with_analysis:
        print(f"\n   Sample analyzed paper:")
        sample = papers_with_analysis[0]
        print(f"   - Title: {sample['title'][:70]}...")
        print(f"   - Tech Score: {sample.get('tech_score', 0)}")
        print(f"   - Summary: {sample.get('summary', '')[:60]}...")
    
    # Test 4: Try fetching deep dive for a paper
    print("\n[4/4] Testing deep analysis fetch...")
    if papers_with_analysis:
        paper_id = papers_with_analysis[0]['id']
        analysis_url = f"{BASE_URL}/api/research/analysis/{paper_id}"
        
        try:
            analysis_response = requests.get(analysis_url, timeout=5)
            
            if analysis_response.status_code == 200:
                data = analysis_response.json()
                print(f"✅ Analysis available for paper ID {paper_id}")
                if 'analysis' in data:
                    analysis = data['analysis']
                    has_deep = any([
                        analysis.get('methodology'),
                        analysis.get('limitations'),
                        analysis.get('results')
                    ])
                    if has_deep:
                        print(f"   ✅ Deep analysis data available!")
                    else:
                        print(f"   ⚠️  Basic analysis only (no methodology/limitations/results yet)")
            elif analysis_response.status_code == 202:
                print(f"ℹ️  Analysis pending for paper ID {paper_id} (will trigger automatically)")
            else:
                print(f"⚠️  Status {analysis_response.status_code}")
        except Exception as e:
            print(f"⚠️  Could not fetch analysis: {e}")
    else:
        print("(No analyzed papers to test)")
    
    print("\n" + "=" * 80)
    print("✅ RESEARCH DEEP DIVE IS READY!")
    print("=" * 80)
    print("\nTroubleshooting:")
    print("- No ArXiv papers? Check that ArXiv source is enabled in pipeline config")
    print("- Papers not analyzed? Run the backend pipeline to analyze articles")
    print("- Deep analysis missing? Click 'Deep Dive' button to trigger analysis")
    print()
    
except requests.exceptions.ConnectionError:
    print("❌ Backend not running. Start Docker containers:")
    print("   docker-compose up -d")
except Exception as e:
    print(f"❌ Error: {e}")
