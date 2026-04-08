#!/usr/bin/env python3
"""Direct test of ContentGenerator to debug the unpacking error"""

import sys
import traceback

try:
    from backend.generators.generator_v5 import ContentGenerator
    
    print("Creating ContentGenerator...")
    generator = ContentGenerator()
    print(f"Generator created: {generator}")
    print(f"Generator client: {generator.client}")
    
    print("\nAttempting to generate content for article 477...")
    results = generator.generate_for_article(477, platforms=["twitter"])
    
    print(f"\nSuccess! Results: {results}")
    
except Exception as e:
    print(f"\nError occurred: {type(e).__name__}: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
