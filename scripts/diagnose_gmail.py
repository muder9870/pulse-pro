#!/usr/bin/env python3
"""Diagnose Gmail fetching issues."""

import os
import sys
import imaplib
import email
from pathlib import Path
from email.utils import parseaddr

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

def print_header(text):
    print(f"\n{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}\n")

def check_env_variables():
    """Check if Gmail credentials are configured."""
    print_header("1. Environment Variables Check")
    
    email_addr = os.getenv("GMAIL_ADDRESS")
    app_pw = os.getenv("GMAIL_APP_PASSWORD")
    gmail_label = os.getenv("GMAIL_LABEL", "")
    
    if not email_addr:
        print("❌ GMAIL_ADDRESS not set in .env")
        return False
    else:
        print(f"✅ GMAIL_ADDRESS: {email_addr}")
    
    if not app_pw:
        print("❌ GMAIL_APP_PASSWORD not set in .env")
        return False
    else:
        print(f"✅ GMAIL_APP_PASSWORD: {'*' * len(app_pw)} (length: {len(app_pw)})")
    
    if gmail_label:
        print(f"✅ GMAIL_LABEL: {gmail_label}")
    else:
        print("ℹ️  GMAIL_LABEL not set (will use INBOX)")
    
    return True

def test_imap_connection():
    """Test IMAP connection to Gmail."""
    print_header("2. IMAP Connection Test")
    
    email_addr = os.getenv("GMAIL_ADDRESS")
    app_pw = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email_addr or not app_pw:
        print("❌ Gmail credentials missing, skipping connection test")
        return False
    
    try:
        print(f"🔌 Connecting to imap.gmail.com...")
        conn = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        print("✅ SSL connection established")
        
        print(f"🔐 Logging in as {email_addr}...")
        conn.login(email_addr, app_pw)
        print("✅ Login successful")
        
        # List capabilities
        print("\n📋 Server capabilities:")
        status, caps = conn.capability()
        if caps:
            caps_list = caps[0].decode().split()
            for cap in sorted(caps_list):
                print(f"   - {cap}")
        
        return conn
    except imaplib.IMAP4.error as e:
        print(f"❌ IMAP Error: {e}")
        if "LOGIN failed" in str(e):
            print("   💡 Tip: Check if Gmail credentials are correct")
            print("   💡 Tip: Ensure 2FA is enabled and App Password is created")
        return None
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def check_mailbox_structure(conn):
    """Check available mailboxes/labels."""
    print_header("3. Mailbox Structure Check")
    
    if not conn:
        print("❌ No IMAP connection")
        return
    
    try:
        status, mailboxes = conn.list()
        if status != "OK":
            print(f"❌ Failed to list mailboxes: {status}")
            return
        
        print(f"Found {len(mailboxes)} mailbox(es):\n")
        
        gmail_label = os.getenv("GMAIL_LABEL", "")
        label_found = False
        
        for i, mb in enumerate(mailboxes, 1):
            mb_str = mb.decode() if isinstance(mb, bytes) else mb
            print(f"  {i:2}. {mb_str}")
            
            if gmail_label and gmail_label in mb_str:
                label_found = True
                print(f"      ✅ This matches GMAIL_LABEL='{gmail_label}'")
        
        if gmail_label and not label_found:
            print(f"\n⚠️  WARNING: GMAIL_LABEL='{gmail_label}' not found in mailboxes!")
            print("   Possible fixes:")
            print("   1. Correct the label name (case-sensitive)")
            print("   2. Leave GMAIL_LABEL empty to search INBOX")
            print("   3. Create the label in Gmail and add emails to it")
        
        return mailboxes
    except Exception as e:
        print(f"❌ Error listing mailboxes: {e}")
        return None

def check_label_contents(conn):
    """Check emails in the configured label."""
    print_header("4. Label/Inbox Contents Check")
    
    if not conn:
        print("❌ No IMAP connection")
        return
    
    gmail_label = os.getenv("GMAIL_LABEL", "INBOX")
    
    try:
        # Format label name properly
        if " " in gmail_label:
            select_name = f'"{gmail_label}"'
        else:
            select_name = gmail_label
        
        print(f"📂 Selecting mailbox: {select_name}")
        status, data = conn.select(select_name)
        
        if status != "OK":
            print(f"❌ Failed to select mailbox: {status}")
            print(f"   Error: {data}")
            return
        
        # Check mailbox info
        mailbox_info = data[0].decode() if data and data[0] else "0"
        print(f"✅ Successfully selected: {select_name}")
        print(f"   Total messages in mailbox: {mailbox_info}")
        
        # Search for unread emails
        print("\n🔍 Searching for unread emails...")
        status, unread_data = conn.search(None, "UNSEEN")
        if status == "OK":
            unread_ids = unread_data[0].split()
            print(f"   Found {len(unread_ids)} unread emails")
            if unread_ids:
                print(f"   IDs: {unread_ids[:10]}{'...' if len(unread_ids) > 10 else ''}")
        
        # Search for all emails
        print("\n📧 Searching for all emails...")
        status, all_data = conn.search(None, "ALL")
        if status == "OK":
            all_ids = all_data[0].split()
            print(f"   Found {len(all_ids)} total emails")
            
            if len(all_ids) == 0:
                print("\n⚠️  WARNING: No emails found in this mailbox!")
                print("   This mailbox may be empty.")
            else:
                # Show last 5 emails
                print(f"\n   Last 5 emails:")
                for msg_id in all_ids[-5:]:
                    try:
                        status, msg_data = conn.fetch(msg_id, "(RFC822.HEADER)")
                        if status == "OK":
                            raw_email = msg_data[0][1]
                            message = email.message_from_bytes(raw_email)
                            subject = message.get("Subject", "[No Subject]")
                            from_addr = message.get("From", "[No From]")
                            sender_email = parseaddr(from_addr)[1]
                            
                            print(f"      • From: {sender_email}")
                            print(f"        Subject: {subject[:60]}")
                    except Exception as e:
                        print(f"      Error fetching message {msg_id}: {e}")
        
    except Exception as e:
        print(f"❌ Error checking label contents: {e}")

def check_newsletter_detection(conn):
    """Check if emails would be detected as newsletters."""
    print_header("5. Newsletter Detection Check")
    
    if not conn:
        print("❌ No IMAP connection")
        return
    
    gmail_label = os.getenv("GMAIL_LABEL", "INBOX")
    
    try:
        # Format label name properly
        if " " in gmail_label:
            select_name = f'"{gmail_label}"'
        else:
            select_name = gmail_label
        
        conn.select(select_name)
        
        # Get last 10 emails
        status, all_data = conn.search(None, "ALL")
        if status != "OK":
            print("❌ Could not search emails")
            return
        
        all_ids = all_data[0].split()[-10:]
        
        if not all_ids:
            print("No emails to analyze")
            return
        
        print(f"Analyzing last {len(all_ids)} emails for newsletter criteria...\n")
        
        # Import fetcher to use AI detection
        from backend.fetchers.gmail_fetcher_smart import SmartGmailFetcher
        
        for msg_id in all_ids:
            try:
                status, msg_data = conn.fetch(msg_id, "(RFC822)")
                if status != "OK":
                    continue
                
                raw_email = msg_data[0][1]
                message = email.message_from_bytes(raw_email)
                
                subject = message.get("Subject", "[No Subject]")
                from_addr = message.get("From", "[No From]")
                sender_email = parseaddr(from_addr)[1]
                
                # Get body
                body = ""
                if message.is_multipart():
                    for part in message.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode(errors="ignore")
                            break
                else:
                    body = message.get_payload(decode=True).decode(errors="ignore")
                
                # Check if it would be detected
                fetcher = SmartGmailFetcher("dummy@gmail.com", "dummy")
                is_ai = fetcher._is_ai_related(subject, body)
                is_newsletter = fetcher._is_newsletter(subject, body, sender_email)
                confidence = fetcher._calculate_confidence(subject, body, sender_email) if (is_ai or is_newsletter) else 0
                
                status_str = "✅" if (is_ai and is_newsletter) else "❌"
                print(f"{status_str} From: {sender_email[:40]}")
                print(f"   Subject: {subject[:60]}")
                print(f"   AI-Related: {is_ai} | Newsletter: {is_newsletter} | Confidence: {confidence:.2f}")
                print()
                
            except Exception as e:
                print(f"Error analyzing message {msg_id}: {e}\n")
        
    except Exception as e:
        print(f"❌ Error in newsletter detection: {e}")

def main():
    """Run all diagnostics."""
    print("\n" + "=" * 70)
    print("  GMAIL FETCHER DIAGNOSTIC TOOL")
    print("=" * 70)
    
    # Step 1: Check env variables
    if not check_env_variables():
        print("\n" + "=" * 70)
        print("  ❌ CONFIGURATION INCOMPLETE")
        print("=" * 70)
        print("\nTo use Gmail fetching, add these to .env:")
        print("  GMAIL_ADDRESS=your-email@gmail.com")
        print("  GMAIL_APP_PASSWORD=your-app-password")
        print("  GMAIL_LABEL=YourLabelName (optional)")
        print("\nSetup instructions:")
        print("  1. Enable 2-Step Verification on your Google account")
        print("  2. Go to myaccount.google.com -> Security -> App Passwords")
        print("  3. Create an App Password and copy it to .env")
        print("  4. Create a label in Gmail if you want to use custom label")
        return
    
    # Step 2: Test IMAP connection
    conn = test_imap_connection()
    
    if conn:
        # Step 3: Check mailbox structure
        check_mailbox_structure(conn)
        
        # Step 4: Check label contents
        check_label_contents(conn)
        
        # Step 5: Check newsletter detection
        check_newsletter_detection(conn)
        
        conn.close()
        conn.logout()
        
        print_header("SUMMARY")
        print("✅ All checks completed!")
        print("\nNext steps:")
        print("  1. If emails are not being detected as newsletters:")
        print("     - Add more AI keywords to the email subject/content")
        print("     - Lower the confidence threshold in SmartGmailFetcher")
        print("  2. If no emails are found:")
        print("     - Ensure you have emails in the specified label")
        print("     - Check the exact label name (case-sensitive)")
        print("  3. Run the pipeline to fetch emails:")
        print("     - POST /api/pipeline/run from the Dashboard")
        print("     - Or run: python -m backend.main_pipeline")
    else:
        print_header("DIAGNOSIS FAILED")
        print("❌ Could not connect to Gmail")
        print("\nTroubleshooting:")
        print("  1. Check credentials in .env")
        print("  2. Verify 2FA is enabled on Google account")
        print("  3. Create App Password: https://myaccount.google.com/apppasswords")
        print("  4. Ensure Gmail account allows IMAP (check Gmail settings)")

if __name__ == "__main__":
    main()
