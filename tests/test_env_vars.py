#!/usr/bin/env python3
"""
Test script to verify environment variables are loaded correctly.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def test_env_vars():
    print("🔍 Testing Environment Variables")
    print("="*50)
    
    # Check environment variables directly
    cerebras_key = os.getenv('CEREBRAS_API_KEY')
    openrouter_key = os.getenv('OPENROUTER_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')
    
    print(f"CEREBRAS_API_KEY: {'✅ Set' if cerebras_key else '❌ Missing'}")
    print(f"OPENROUTER_API_KEY: {'✅ Set' if openrouter_key else '❌ Missing'}")
    print(f"GROQ_API_KEY: {'✅ Set' if groq_key else '❌ Missing'}")
    
    # Test settings import
    try:
        from backend.config import settings
        
        print(f"\n📋 Settings from config:")
        print(f"CEREBRAS_API_KEY: {'✅ Set' if hasattr(settings, 'CEREBRAS_API_KEY') and getattr(settings, 'CEREBRAS_API_KEY') else '❌ Missing'}")
        print(f"OPENROUTER_API_KEY: {'✅ Set' if hasattr(settings, 'OPENROUTER_API_KEY') and getattr(settings, 'OPENROUTER_API_KEY') else '❌ Missing'}")
        print(f"GROQ_API_KEY: {'✅ Set' if hasattr(settings, 'GROQ_API_KEY') and getattr(settings, 'GROQ_API_KEY') else '❌ Missing'}")
        
    except Exception as e:
        print(f"\n❌ Error importing settings: {e}")
    
    # Test client initialization
    try:
        from backend.llm.llm_router import SmartLLMRouter
        
        print(f"\n🤖 Testing SmartLLMRouter initialization:")
        router = SmartLLMRouter()
        status = router.get_status()
        
        print(f"Available providers: {status.get('available_providers', [])}")
        print(f"Failed providers: {status.get('failed_providers', [])}")
        
    except Exception as e:
        print(f"\n❌ Error initializing router: {e}")

if __name__ == "__main__":
    test_env_vars()
