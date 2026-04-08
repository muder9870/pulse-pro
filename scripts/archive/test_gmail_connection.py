#!/usr/bin/env python3
"""Test Gmail connection and fetch newsletters."""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.fetchers.gmail_fetcher import GmailFetcher

print("=" * 60)
print("GMAIL CONNECTION TEST")
print("=" * 60)

# Get credentials from environment
email = os.getenv("GMAIL_ADDRESS")
password = os.getenv("GMAIL_APP_PASSWORD")

print(f"\n📧 Email: {email}")
print(f"🔑 Password: {'*' * len(password) if password else 'NOT SET'}")

if not email or not password:
    print("\n❌ Gmail credentials not found in environment!")
    print("Make sure .env file has:")
    print("  GMAIL_ADDRESS=your@email.com")
    print("  GMAIL_APP_PASSWORD=your-app-password")
    sys.exit(1)

# Remove spaces from password (common issue)
password_clean = password.replace(" ", "")
if password != password_clean:
    print(f"\n⚠️  Password has spaces! Cleaning...")
    print(f"   Original length: {len(password)}")
    print(f"   Cleaned length: {len(password_clean)}")
    password = password_clean

print("\n🔌 Connecting to Gmail...")
try:
    fetcher = GmailFetcher(email_addr=email, app_password=password)
    fetcher.connect()
    print("✅ Connected successfully!")
    
    print("\n📬 Checking inbox...")
    # Try to get message count
    status, messages = fetcher.conn.select('INBOX')
    if status == 'OK':
        count = int(messages[0])
        print(f"✅ Inbox has {count} total messages")
    
    print("\n🔍 Searching for newsletters from configured senders...")
    senders = [
        "tldr@mail.tldrnewsletter.com",
        "batch@deeplearning.ai",
        "newsletters@superhuman.com",
    ]
    
    for sender in senders:
        print(f"\n  Checking: {sender}")
        status, messages = fetcher.conn.search(None, f'FROM "{sender}"')
        if status == 'OK':
            msg_ids = messages[0].split()
            print(f"    Found: {len(msg_ids)} messages")
            
            # Check for unread
            status, unread = fetcher.conn.search(None, f'FROM "{sender}" UNSEEN')
            if status == 'OK':
                unread_ids = unread[0].split()
                print(f"    Unread: {len(unread_ids)} messages")
        else:
            print(f"    ❌ Search failed: {status}")
    
    print("\n🔍 Checking for ANY AI-related newsletters...")
    keywords = ["AI", "artificial intelligence", "machine learning", "deep learning", "newsletter"]
    for keyword in keywords[:2]:  # Just check first 2
        status, messages = fetcher.conn.search(None, f'SUBJECT "{keyword}"')
        if status == 'OK':
            msg_ids = messages[0].split()
            if len(msg_ids) > 0:
                print(f"  '{keyword}': {len(msg_ids)} messages")
    
    fetcher.close()
    print("\n✅ Gmail connection test complete!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print(f"\nError type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("RECOMMENDATIONS:")
print("=" * 60)
print("\nIf no messages found from configured senders:")
print("  1. Check if you actually receive these newsletters")
print("  2. Add your actual newsletter senders to the list")
print("  3. Check Gmail inbox for newsletter sender addresses")
print("\nTo add custom senders, edit:")
print("  backend/main_pipeline.py (line 67-71)")
print("=" * 60)
