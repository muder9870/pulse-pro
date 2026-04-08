#!/usr/bin/env python3
"""Scan Gmail inbox for AI newsletter senders and auto-configure."""

import os
import sys
import re
from pathlib import Path
from collections import Counter
from email.utils import parseaddr

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.fetchers.gmail_fetcher import GmailFetcher

print("=" * 70)
print("AI PULSE PRO - GMAIL SENDER AUTO-SCANNER")
print("=" * 70)

# Get credentials from environment
email = os.getenv("GMAIL_ADDRESS")
password = os.getenv("GMAIL_APP_PASSWORD")

if not email or not password:
    print("\n❌ Gmail credentials not found in environment!")
    sys.exit(1)

# Clean password (remove spaces)
password = password.replace(" ", "")

print(f"\n📧 Scanning inbox: {email}")
print("🔍 Looking for AI-related newsletters...\n")

try:
    # Connect to Gmail
    fetcher = GmailFetcher(email_addr=email, app_password=password)
    fetcher.connect()
    
    # Select inbox
    fetcher.conn.select('INBOX')
    
    # Search for AI-related emails
    ai_keywords = [
        "AI", "artificial intelligence", "machine learning", "deep learning",
        "neural network", "GPT", "LLM", "OpenAI", "ChatGPT", "Claude",
        "data science", "ML", "NLP", "computer vision", "transformer"
    ]
    
    print("📬 Searching for AI-related emails...")
    all_msg_ids = set()
    
    for keyword in ai_keywords[:5]:  # Check first 5 keywords
        status, messages = fetcher.conn.search(None, f'SUBJECT "{keyword}"')
        if status == 'OK' and messages[0]:
            msg_ids = messages[0].split()
            all_msg_ids.update(msg_ids)
            print(f"  '{keyword}': {len(msg_ids)} messages")
    
    print(f"\n✅ Found {len(all_msg_ids)} unique AI-related messages")
    
    if len(all_msg_ids) == 0:
        print("\n⚠️  No AI-related emails found.")
        print("Try subscribing to some AI newsletters first!")
        fetcher.close()
        sys.exit(0)
    
    # Analyze senders
    print("\n🔍 Analyzing senders...")
    sender_counter = Counter()
    sender_subjects = {}
    
    # Sample up to 50 messages to avoid taking too long
    sample_ids = list(all_msg_ids)[:50]
    
    for msg_id in sample_ids:
        try:
            status, msg_data = fetcher.conn.fetch(msg_id, '(RFC822)')
            if status != 'OK':
                continue
            
            import email
            email_message = email.message_from_bytes(msg_data[0][1])
            
            # Get sender
            from_header = email_message.get('From', '')
            sender_name, sender_email = parseaddr(from_header)
            
            if sender_email:
                sender_counter[sender_email] += 1
                
                # Store a sample subject
                if sender_email not in sender_subjects:
                    subject = email_message.get('Subject', 'No subject')
                    sender_subjects[sender_email] = subject
        
        except Exception as e:
            continue
    
    fetcher.close()
    
    # Display results
    print("\n" + "=" * 70)
    print("📊 AI NEWSLETTER SENDERS FOUND")
    print("=" * 70)
    
    if not sender_counter:
        print("\n⚠️  Could not extract sender information.")
        print("This might be due to email format issues.")
        sys.exit(0)
    
    # Sort by frequency
    sorted_senders = sender_counter.most_common()
    
    print(f"\nFound {len(sorted_senders)} unique senders:\n")
    
    for i, (sender, count) in enumerate(sorted_senders, 1):
        subject = sender_subjects.get(sender, "")[:60]
        print(f"{i:2d}. {sender}")
        print(f"    📧 {count} messages")
        print(f"    📝 Sample: {subject}")
        print()
    
    # Ask user to select senders
    print("=" * 70)
    print("SELECT SENDERS TO ADD")
    print("=" * 70)
    print("\nEnter the numbers of senders you want to add (comma-separated)")
    print("Example: 1,2,3  or  1-5  or  all")
    print("Or press Enter to skip\n")
    
    selection = input("Your selection: ").strip().lower()
    
    if not selection:
        print("\n⚠️  No senders selected. Exiting.")
        sys.exit(0)
    
    # Parse selection
    selected_senders = []
    
    if selection == "all":
        selected_senders = [sender for sender, _ in sorted_senders]
    else:
        # Parse numbers and ranges
        parts = selection.replace(" ", "").split(",")
        selected_indices = set()
        
        for part in parts:
            if "-" in part:
                # Range like 1-5
                try:
                    start, end = map(int, part.split("-"))
                    selected_indices.update(range(start, end + 1))
                except:
                    pass
            else:
                # Single number
                try:
                    selected_indices.add(int(part))
                except:
                    pass
        
        # Get senders by index
        for idx in sorted(selected_indices):
            if 1 <= idx <= len(sorted_senders):
                selected_senders.append(sorted_senders[idx - 1][0])
    
    if not selected_senders:
        print("\n⚠️  No valid senders selected. Exiting.")
        sys.exit(0)
    
    print(f"\n✅ Selected {len(selected_senders)} senders:")
    for sender in selected_senders:
        print(f"  • {sender}")
    
    # Update configuration
    print("\n" + "=" * 70)
    print("UPDATING CONFIGURATION")
    print("=" * 70)
    
    pipeline_file = Path("backend/main_pipeline.py")
    
    if not pipeline_file.exists():
        print(f"\n❌ Could not find {pipeline_file}")
        sys.exit(1)
    
    # Read current file
    content = pipeline_file.read_text()
    
    # Find the senders list
    pattern = r'senders = \[(.*?)\]'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print("\n❌ Could not find senders list in main_pipeline.py")
        sys.exit(1)
    
    # Create new senders list
    new_senders_lines = []
    for sender in selected_senders:
        new_senders_lines.append(f'                    "{sender}",')
    
    new_senders_block = "senders = [\n" + "\n".join(new_senders_lines) + "\n                ]"
    
    # Replace in content
    old_block = "senders = [" + match.group(1) + "]"
    new_content = content.replace(old_block, new_senders_block)
    
    # Backup original file
    backup_file = pipeline_file.with_suffix('.py.backup')
    pipeline_file.rename(backup_file)
    print(f"\n💾 Backup created: {backup_file}")
    
    # Write new file
    pipeline_file.write_text(new_content)
    print(f"✅ Updated: {pipeline_file}")
    
    print("\n" + "=" * 70)
    print("✅ CONFIGURATION UPDATED SUCCESSFULLY!")
    print("=" * 70)
    
    print("\n📋 New sender list:")
    for sender in selected_senders:
        print(f"  • {sender}")
    
    print("\n🚀 NEXT STEPS:")
    print("=" * 70)
    print("\n1. Restart the backend:")
    print("   docker-compose restart backend")
    print("\n2. Run the pipeline:")
    print("   Click 'Fetch New Data' in the dashboard")
    print("\n3. Check for Gmail articles:")
    print("   python check_gmail.py")
    print("\n" + "=" * 70)
    print("✅ Setup complete! Your Gmail fetcher is now configured.")
    print("=" * 70)

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
