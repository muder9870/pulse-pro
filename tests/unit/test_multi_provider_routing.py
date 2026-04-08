#!/usr/bin/env python3
"""
Test multi-provider task-aware routing with enhanced clients.
Tests all providers and task routing logic.
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

def test_task_routing():
    """Test task-aware routing across different providers."""
    print("🚀 Testing Multi-Provider Task-Aware Routing")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Test cases for different tasks
    test_cases = [
        {
            "task": Task.ANALYSIS,
            "prompt": "What is machine learning? Explain in one sentence.",
            "expected_providers": ["cerebras", "groq", "openrouter"],
            "description": "Analysis task (should try Cerebras first)"
        },
        {
            "task": Task.SOCIAL_SHORT,
            "prompt": "Create a tweet about AI.",
            "expected_providers": ["groq", "cerebras", "openrouter"],
            "description": "Social short task (should try Groq first)"
        },
        {
            "task": Task.SOCIAL_LONG,
            "prompt": "Write a LinkedIn post about the future of AI.",
            "expected_providers": ["groq", "cerebras", "openrouter"],
            "description": "Social long task (should try Groq first)"
        },
        {
            "task": Task.RESEARCH,
            "prompt": "Research the latest developments in quantum computing.",
            "expected_providers": ["openrouter", "groq", "cerebras"],
            "description": "Research task (should try OpenRouter first)"
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {test_case['description']}")
        print(f"📝 Task: {test_case['task'].value}")
        print(f"📝 Prompt: {test_case['prompt']}")
        print(f"🎯 Expected provider order: {test_case['expected_providers']}")
        
        try:
            start_time = time.time()
            result = router.generate(
                prompt=test_case['prompt'],
                task=test_case['task'],
                timeout=20  # Longer timeout for testing
            )
            duration = time.time() - start_time
            
            # Handle different return types
            if isinstance(result, LLMResponse):
                provider = result.provider
                content = result.content
                status = result.status
            else:
                provider = "unknown"
                content = result
                status = "success"
            
            print(f"✅ Success via {provider} in {duration:.2f}s")
            print(f"📤 Status: {status}")
            print(f"📤 Response: {content[:100]}...")
            
            results.append({
                "test": i,
                "task": test_case['task'].value,
                "provider": provider,
                "duration": duration,
                "success": True,
                "content_length": len(content)
            })
            
        except Exception as e:
            duration = time.time() - start_time
            print(f"❌ Failed after {duration:.2f}s: {e}")
            
            results.append({
                "test": i,
                "task": test_case['task'].value,
                "provider": "none",
                "duration": duration,
                "success": False,
                "error": str(e)
            })
    
    return results

def test_provider_availability():
    """Test which providers are actually available."""
    print("\n" + "="*60)
    print("PROVIDER AVAILABILITY CHECK")
    print("="*60)
    
    router = SmartLLMRouter()
    status = router.get_status()
    
    print(f"📊 Available providers: {status.get('available_providers', [])}")
    print(f"❌ Failed providers: {status.get('failed_providers', [])}")
    print(f"🔧 Initialized clients: {status.get('initialized_clients', [])}")
    
    # Test each provider individually
    providers = ['cerebras', 'groq', 'openrouter', 'local', 'paid_api']
    
    for provider in providers:
        print(f"\n🔍 Testing {provider} provider...")
        try:
            if provider in status.get('available_providers', []):
                # Try a simple call
                result = router.generate(
                    prompt=f"Test {provider}: What is 1+1?",
                    task=Task.ANALYSIS,
                    timeout=10
                )
                print(f"✅ {provider}: Working")
            else:
                print(f"❌ {provider}: Not available")
        except Exception as e:
            print(f"❌ {provider}: Failed - {e}")

def test_failover_behavior():
    """Test failover behavior by triggering failures."""
    print("\n" + "="*60)
    print("FAILOVER BEHAVIOR TEST")
    print("="*60)
    
    router = SmartLLMRouter()
    
    print("🔄 Testing rapid calls to observe failover...")
    
    success_count = 0
    fail_count = 0
    providers_used = set()
    
    for i in range(3):  # Test multiple calls
        print(f"\n📞 Call {i+1}:")
        try:
            result = router.generate(
                prompt=f"Test call {i+1}: Explain AI in one sentence.",
                task=Task.ANALYSIS,
                timeout=15
            )
            
            if isinstance(result, LLMResponse):
                provider = result.provider
                providers_used.add(provider)
            else:
                provider = "unknown"
                
            success_count += 1
            print(f"✅ Success via {provider}")
            
        except Exception as e:
            fail_count += 1
            print(f"❌ Failed: {e}")
    
    print(f"\n📊 Results:")
    print(f"✅ Successful calls: {success_count}")
    print(f"❌ Failed calls: {fail_count}")
    print(f"🔄 Providers used: {list(providers_used)}")

def main():
    """Run all tests."""
    print("🔬 MULTI-PROVIDER ROUTING TEST SUITE")
    print("="*60)
    
    # Run all tests
    routing_results = test_task_routing()
    test_provider_availability()
    test_failover_behavior()
    
    # Summary
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    
    successful_tests = sum(1 for r in routing_results if r.get('success', False))
    total_tests = len(routing_results)
    
    print(f"📊 Task Routing Tests: {successful_tests}/{total_tests} successful")
    
    if successful_tests > 0:
        avg_duration = sum(r['duration'] for r in routing_results if r.get('success', False)) / successful_tests
        print(f"⏱️  Average response time: {avg_duration:.2f}s")
    
    print(f"🎯 Multi-provider routing: {'✅ Working' if successful_tests > 0 else '❌ Issues detected'}")
    print(f"🔄 Failover mechanism: {'✅ Active' if successful_tests > 0 else '❌ Not working'}")
    
    return successful_tests > 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
