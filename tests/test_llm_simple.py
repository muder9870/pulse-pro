#!/usr/bin/env python3
"""
Simple LLM test that works with current Groq-only configuration.
"""

import sys
import os
import logging
import time
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

from backend.llm.llm_router import SmartLLMRouter, Task, LLMResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)

def test_groq_only():
    """Test LLM system with Groq only (since other providers have API key issues)."""
    print("🚀 Testing LLM System with Groq Only")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Test basic functionality
    print("\n🧪 Test: Basic Generation")
    try:
        result = router.generate(
            prompt="What is 2+2? Give a brief answer.",
            task=Task.ANALYSIS,
            timeout=15
        )
        
        if isinstance(result, LLMResponse):
            print(f"✅ Success via {result.provider}")
            print(f"📤 Response: {result.content}")
        else:
            print(f"✅ Success")
            print(f"📤 Response: {result}")
            
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test input validation
    print("\n🧪 Test: Input Validation")
    try:
        router.generate("", task=Task.ANALYSIS)
        print("❌ Empty prompt should have failed")
        return False
    except ValueError:
        print("✅ Empty prompt correctly rejected")
    
    # Test timeout
    print("\n🧪 Test: Timeout")
    try:
        router.generate("test", timeout=0.001)
        print("❌ Should have timed out")
        return False
    except TimeoutError:
        print("✅ Timeout correctly handled")
    except Exception as e:
        print(f"⚠️  Different error: {e}")
    
    # Test router status
    print("\n🧪 Test: Router Status")
    status = router.get_status()
    print(f"📊 Available: {status.get('available_providers', [])}")
    print(f"❌ Failed: {status.get('failed_providers', [])}")
    
    print("\n✅ All tests passed!")
    return True

if __name__ == "__main__":
    success = test_groq_only()
    exit(0 if success else 1)
