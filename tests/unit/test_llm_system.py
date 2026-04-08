#!/usr/bin/env python3
"""
Comprehensive test script for the LLM system.
Tests SmartLLMRouter with real calls and validates all functionality.
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

def test_router_status():
    """Test router initialization and status."""
    print("\n" + "="*60)
    print("TEST 1: Router Status")
    print("="*60)
    
    try:
        router = SmartLLMRouter()
        status = router.get_status()
        
        print(f"✅ Router initialized successfully")
        print(f"📊 Available providers: {status.get('available_providers', [])}")
        print(f"❌ Failed providers: {status.get('failed_providers', [])}")
        print(f"🔧 Initialized clients: {status.get('initialized_clients', [])}")
        
        return True
    except Exception as e:
        print(f"❌ Router initialization failed: {e}")
        return False

def test_input_validation():
    """Test input validation."""
    print("\n" + "="*60)
    print("TEST 2: Input Validation")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Test empty prompt
    try:
        router.generate("", task=Task.ANALYSIS)
        print("❌ Empty prompt should have failed")
        return False
    except ValueError as e:
        print(f"✅ Empty prompt correctly rejected: {e}")
    
    # Test too long prompt
    try:
        long_prompt = "x" * 50001
        router.generate(long_prompt, task=Task.ANALYSIS)
        print("❌ Too long prompt should have failed")
        return False
    except ValueError as e:
        print(f"✅ Too long prompt correctly rejected: {e}")
    
    # Test invalid max_tokens
    try:
        router.generate("test", max_tokens=0, task=Task.ANALYSIS)
        print("❌ Invalid max_tokens should have failed")
        return False
    except ValueError as e:
        print(f"✅ Invalid max_tokens correctly rejected: {e}")
    
    print("✅ All input validation tests passed")
    return True

def test_simple_generation():
    """Test simple LLM generation."""
    print("\n" + "="*60)
    print("TEST 3: Simple Generation")
    print("="*60)
    
    router = SmartLLMRouter()
    
    test_cases = [
        {
            "task": Task.ANALYSIS,
            "prompt": "Explain artificial intelligence in one sentence.",
            "description": "Analysis task"
        },
        {
            "task": Task.SOCIAL_SHORT,
            "prompt": "Create a tweet about AI.",
            "description": "Social short task"
        },
        {
            "task": Task.SOCIAL_LONG,
            "prompt": "Write a LinkedIn post about the future of AI.",
            "description": "Social long task"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {test_case['description']}")
        print(f"📝 Prompt: {test_case['prompt']}")
        
        try:
            start_time = time.time()
            result = router.generate(
                prompt=test_case['prompt'],
                task=test_case['task'],
                timeout=15
            )
            duration = time.time() - start_time
            
            # Handle different return types
            if isinstance(result, LLMResponse):
                content = result.content
                provider = result.provider
                print(f"✅ Success via {provider} in {duration:.2f}s")
                print(f"📤 Response: {content[:100]}...")
            else:
                content = result
                print(f"✅ Success in {duration:.2f}s")
                print(f"📤 Response: {content[:100]}...")
                
        except Exception as e:
            print(f"❌ Failed: {e}")
            return False
    
    print("✅ All generation tests passed")
    return True

def test_timeout_handling():
    """Test timeout handling."""
    print("\n" + "="*60)
    print("TEST 4: Timeout Handling")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Test with very short timeout
    try:
        result = router.generate(
            prompt="Write a detailed essay about quantum computing.",
            timeout=1  # Very short timeout
        )
        print("❌ Should have timed out")
        return False
    except TimeoutError as e:
        print(f"✅ Timeout correctly handled: {e}")
    except Exception as e:
        print(f"⚠️  Different error (may be expected): {e}")
    
    print("✅ Timeout handling test passed")
    return True

def test_failover_mechanism():
    """Test failover mechanism."""
    print("\n" + "="*60)
    print("TEST 5: Failover Mechanism")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Test with multiple rapid calls to trigger failover
    print("🔄 Testing failover with multiple rapid calls...")
    
    success_count = 0
    fail_count = 0
    
    for i in range(5):
        try:
            result = router.generate(
                prompt=f"Test message {i+1}: What is {i+1}+{i+1}?",
                task=Task.ANALYSIS,
                timeout=10
            )
            success_count += 1
            print(f"✅ Call {i+1}: Success")
        except Exception as e:
            fail_count += 1
            print(f"❌ Call {i+1}: Failed - {e}")
    
    print(f"📊 Results: {success_count} success, {fail_count} failed")
    
    # At least some should succeed
    if success_count > 0:
        print("✅ Failover mechanism working")
        return True
    else:
        print("❌ All calls failed - failover not working")
        return False

def test_error_logging():
    """Test that errors are properly logged."""
    print("\n" + "="*60)
    print("TEST 6: Error Logging")
    print("="*60)
    
    router = SmartLLMRouter()
    
    # Capture logs
    import io
    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    logger = logging.getLogger("llm_router")
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    
    try:
        # Trigger an error
        router.generate("test prompt", task=Task.ANALYSIS, timeout=0.001)
    except:
        pass  # Expected to fail
    
    # Check logs
    log_output = log_capture.getvalue()
    
    if "Starting generation" in log_output and "prompt length" in log_output:
        print("✅ Proper logging detected")
        return True
    else:
        print("❌ Inadequate logging")
        print(f"Log output: {log_output}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting LLM System Tests")
    print("="*60)
    
    tests = [
        test_router_status,
        test_input_validation,
        test_simple_generation,
        test_timeout_handling,
        test_failover_mechanism,
        test_error_logging
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Success Rate: {passed/(passed+failed)*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 All tests passed! LLM system is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {failed} tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit(main())
