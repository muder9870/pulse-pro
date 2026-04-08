#!/usr/bin/env python3
"""Manage Gmail newsletter senders - view, add, remove, discover."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.fetchers.gmail_fetcher_smart import SmartGmailFetcher
from backend.database import get_session
from backend.models import GmailNewsletterSender
from sqlalchemy import func
import os

def show_menu():
    """Display main menu."""
    print("\n" + "=" * 70)
    print("GMAIL NEWSLETTER SENDER MANAGEMENT")
    print("=" * 70)
    print("\n1. View all discovered senders")
    print("2. Discover new senders now")
    print("3. Add sender manually")
    print("4. Deactivate sender")
    print("5. Activate sender")
    print("6. View statistics")
    print("7. Export sender list")
    print("0. Exit")
    print("\n" + "=" * 70)

def view_senders():
    """View all discovered senders."""
    email = os.getenv("GMAIL_ADDRESS")
    password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email or not password:
        print("\n❌ Gmail credentials not configured!")
        return
    
    password = password.replace(" ", "")
    
    fetcher = SmartGmailFetcher(email_addr=email, app_password=password)
    fetcher._create_senders_table()
    
    senders = fetcher.get_sender_stats()
    
    if not senders:
        print("\n⚠️  No senders discovered yet.")
        print("Run option 2 to discover senders from your inbox.")
        return
    
    print("\n" + "=" * 70)
    print(f"DISCOVERED SENDERS ({len(senders)} total)")
    print("=" * 70)
    
    active_senders = [s for s in senders if s['is_active']]
    inactive_senders = [s for s in senders if not s['is_active']]
    
    if active_senders:
        print(f"\n✅ ACTIVE SENDERS ({len(active_senders)}):\n")
        for i, sender in enumerate(active_senders, 1):
            print(f"{i:2d}. {sender['sender_email']}")
            if sender['sender_name']:
                print(f"    Name: {sender['sender_name']}")
            print(f"    Messages: {sender['message_count']}")
            print(f"    Confidence: {sender['confidence_score']:.2f}")
            print(f"    Sample: {sender['sample_subject'][:60] if sender['sample_subject'] else 'N/A'}")
            print(f"    First seen: {sender['first_seen']}")
            print()
    
    if inactive_senders:
        print(f"\n⏸️  INACTIVE SENDERS ({len(inactive_senders)}):\n")
        for sender in inactive_senders:
            print(f"  • {sender['sender_email']} (deactivated)")

def discover_senders():
    """Discover new senders from inbox."""
    email = os.getenv("GMAIL_ADDRESS")
    password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email or not password:
        print("\n❌ Gmail credentials not configured!")
        return
    
    password = password.replace(" ", "")
    
    print("\n🔍 Connecting to Gmail...")
    fetcher = SmartGmailFetcher(email_addr=email, app_password=password)
    
    try:
        fetcher.connect()
        print("✅ Connected successfully!")
        
        print("\n🔍 Scanning inbox for AI newsletters...")
        print("This may take a minute...\n")
        
        new_senders = fetcher.discover_newsletters(max_messages=100)
        
        print(f"\n✅ Discovery complete!")
        print(f"Found {new_senders} new AI newsletter senders")
        
        if new_senders > 0:
            print("\nRun option 1 to view all discovered senders.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        fetcher.close()

def add_sender_manually():
    """Add a sender manually."""
    print("\n" + "=" * 70)
    print("ADD SENDER MANUALLY")
    print("=" * 70)
    
    sender_email = input("\nEnter sender email address: ").strip()
    if not sender_email:
        print("❌ Email address required!")
        return
    
    sender_name = input("Enter sender name (optional): ").strip() or None
    sample_subject = input("Enter sample subject (optional): ").strip() or None
    
    try:
        with get_session() as session:
            sender = GmailNewsletterSender(
                sender_email=sender_email,
                sender_name=sender_name,
                sample_subject=sample_subject,
                confidence_score=1.0,
                is_ai_related=1,
                is_active=1
            )
            session.add(sender)
            session.commit()
            print(f"\n✅ Added sender: {sender_email}")
    except Exception as e:
        print(f"\n❌ Error: {e}")

def toggle_sender(activate: bool):
    """Activate or deactivate a sender."""
    view_senders()
    
    sender_email = input(f"\nEnter sender email to {'activate' if activate else 'deactivate'}: ").strip()
    if not sender_email:
        return
    
    try:
        with get_session() as session:
            sender = session.query(GmailNewsletterSender).filter(
                GmailNewsletterSender.sender_email == sender_email
            ).first()
            
            if sender:
                sender.is_active = 1 if activate else 0
                session.commit()
                print(f"\n✅ Sender {'activated' if activate else 'deactivated'}: {sender_email}")
            else:
                print(f"\n❌ Sender not found: {sender_email}")
    except Exception as e:
        print(f"\n❌ Error: {e}")

def view_statistics():
    """View statistics about senders."""
    email = os.getenv("GMAIL_ADDRESS")
    password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email or not password:
        print("\n❌ Gmail credentials not configured!")
        return
    
    password = password.replace(" ", "")
    
    fetcher = SmartGmailFetcher(email_addr=email, app_password=password)
    fetcher._create_senders_table()
    
    senders = fetcher.get_sender_stats()
    
    if not senders:
        print("\n⚠️  No senders discovered yet.")
        return
    
    print("\n" + "=" * 70)
    print("STATISTICS")
    print("=" * 70)
    
    total = len(senders)
    active = sum(1 for s in senders if s['is_active'])
    inactive = total - active
    total_messages = sum(s['message_count'] for s in senders)
    avg_confidence = sum(s['confidence_score'] for s in senders) / total if total > 0 else 0
    
    print(f"\nTotal senders: {total}")
    print(f"Active senders: {active}")
    print(f"Inactive senders: {inactive}")
    print(f"Total messages processed: {total_messages}")
    print(f"Average confidence: {avg_confidence:.2f}")
    
    print("\n📊 Top 5 senders by message count:")
    top_senders = sorted(senders, key=lambda x: x['message_count'], reverse=True)[:5]
    for i, sender in enumerate(top_senders, 1):
        print(f"  {i}. {sender['sender_email']}: {sender['message_count']} messages")

def export_senders():
    """Export sender list."""
    email = os.getenv("GMAIL_ADDRESS")
    password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email or not password:
        print("\n❌ Gmail credentials not configured!")
        return
    
    password = password.replace(" ", "")
    
    fetcher = SmartGmailFetcher(email_addr=email, app_password=password)
    fetcher._create_senders_table()
    
    senders = fetcher.get_sender_stats()
    active_senders = [s for s in senders if s['is_active']]
    
    if not active_senders:
        print("\n⚠️  No active senders to export.")
        return
    
    print("\n" + "=" * 70)
    print("EXPORT SENDER LIST")
    print("=" * 70)
    
    print("\nActive senders (copy this list):\n")
    print("```python")
    print("senders = [")
    for sender in active_senders:
        print(f'    "{sender["sender_email"]}",  # {sender["message_count"]} messages')
    print("]")
    print("```")
    
    # Also save to file
    with open("gmail_senders_export.txt", "w") as f:
        for sender in active_senders:
            f.write(f"{sender['sender_email']}\n")
    
    print("\n✅ Also saved to: gmail_senders_export.txt")

def main():
    """Main menu loop."""
    while True:
        show_menu()
        choice = input("Select option: ").strip()
        
        if choice == "0":
            print("\n👋 Goodbye!")
            break
        elif choice == "1":
            view_senders()
        elif choice == "2":
            discover_senders()
        elif choice == "3":
            add_sender_manually()
        elif choice == "4":
            toggle_sender(activate=False)
        elif choice == "5":
            toggle_sender(activate=True)
        elif choice == "6":
            view_statistics()
        elif choice == "7":
            export_senders()
        else:
            print("\n❌ Invalid option!")
        
        input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()
