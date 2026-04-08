#!/usr/bin/env python3
"""
Simple test to verify multi-provider routing works.
Tests each provider directly to bypass circuit breaker issues.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def test_direct_clients():
    print("🔍 Testing Direct Client Calls")
    print("="*50)
    
    # Test Cerebras directly
    try:
        from backend.llm.clients.cerebras_client import CerebrasClient
        print("\n🧪 Testing Cerebras client...")
        client = CerebrasClient()
        result = client.generate("What is 2+2? Give a brief answer.", max_tokens=50)
        print(f"✅ Cerebras: {result[:100]}...")
    except Exception as e:
        print(f"❌ Cerebras failed: {e}")
    
    # Test OpenRouter directly
    try:
        from backend.llm.clients.openrouter_client import OpenRouterClient
        print("\n🧪 Testing OpenRouter client...")
        client = OpenRouterClient()
        result = client.generate("What is 2+2? Give a brief answer.", max_tokens=50)
        print(f"✅ OpenRouter: {result[:100]}...")
    except Exception as e:
        print(f"❌ OpenRouter failed: {e}")
    
    # Test Groq directly
    try:
        from backend.llm.clients.groq_client import GroqClient
        print("\n🧪 Testing Groq client...")
        client = GroqClient()
        result = client.generate("What is 2+2? Give a brief answer.", max_tokens=50)
        print(f"✅ Groq: {result[:100]}...")
    except Exception as e:
        print(f"❌ Groq failed: {e}")

def test_task_routing():
    print("\n🎯 Testing Task-Aware Routing")
    print("="*50)
    
    try:
        from backend.llm.llm_router import SmartLLMRouter, Task
        
        router = SmartLLMRouter()
        
        # Test different tasks
        tasks = [
            (Task.ANALYSIS, "What is machine learning? One sentence."),
            (Task.SOCIAL_SHORT, "Create a tweet about AI."),
            (Task.SOCIAL_LONG, "Write a LinkedIn post about AI."),
            (Task.RESEARCH, "Research quantum computing briefly.")
        ]
        
        for task, prompt in tasks:
            print(f"\n📋 Task: {task.value}")
            try:
                result = router.generate(prompt=prompt, task=task, timeout=30)
                if hasattr(result, 'provider'):
                    provider = result.provider
                    content = result.content
                else:
                    provider = "unknown"
                    content = str(result)
                print(f"✅ Success via {provider}: {content[:80]}...")
            except Exception as e:
                print(f"❌ Failed: {e}")
                
    except Exception as e:
        print(f"❌ Router test failed: {e}")

def main():
    print("🚀 MULTI-PROVIDER ROUTING TEST")
    print("="*60)
    
    # Check environment
    cerebras_key = os.getenv('CEREBRAS_API_KEY')
    openrouter_key = os.getenv('OPENROUTER_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')
    
    print(f"🔑 API Keys Status:")
    print(f"  Cerebras: {'✅' if cerebras_key else '❌'}")
    print(f"  OpenRouter: {'✅' if openrouter_key else '❌'}")
    print(f"  Groq: {'✅' if groq_key else '❌'}")
    
    test_direct_clients()
    test_task_routing()
    
    print("\n🎉 TEST COMPLETE")

if __name__ == "__main__":
    main()
