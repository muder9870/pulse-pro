import os
import imaplib
import email
from email.header import decode_header
from email.utils import parseaddr
from dotenv import load_dotenv
from backend.fetchers.gmail_fetcher_smart import SmartGmailFetcher

def debug_scan():
    load_dotenv()
    email_addr = os.getenv("GMAIL_ADDRESS")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email_addr or not app_password:
        print("No Gmail credentials")
        return

    fetcher = SmartGmailFetcher(email_addr=email_addr, app_password=app_password)
    fetcher.connect()
    fetcher.conn.select("INBOX")
    
    # Search for last 20 messages
    status, data = fetcher.conn.search(None, "ALL")
    msg_ids = data[0].split()
    last_ids = msg_ids[-10:]
    
    print(f"Analyzing last {len(last_ids)} messages for AI classification:")
    for m_id in reversed(last_ids):
        status, msg_data = fetcher.conn.fetch(m_id, "(RFC822)")
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        
        subject = fetcher._decode_header(msg.get("Subject", ""))
        sender_name, sender_email = parseaddr(msg.get("From", ""))
        body_html, body_text = fetcher._extract_bodies(msg)
        body = body_html or body_text or ""
        
        is_ai = fetcher._is_ai_related(subject, body)
        is_newsletter = fetcher._is_newsletter(subject, body, sender_email)
        confidence = fetcher._calculate_confidence(subject, body, sender_email)
        
        # Keyword count
        text = f"{subject} {body}".lower()
        keyword_matches = sum(1 for keyword in fetcher.AI_KEYWORDS if keyword.lower() in text)
        
        status_str = "YES" if (is_ai and is_newsletter) else "NO"
        
        print(f"\n- From: {sender_email}")
        print(f"  Subject: {subject[:80]}")
        print(f"  AI Related: {is_ai} (Keywords: {keyword_matches})")
        print(f"  Is Newsletter: {is_newsletter}")
        print(f"  Confidence: {confidence:.2f} | Final Check: {status_str}")

    fetcher.close()

if __name__ == "__main__":
    debug_scan()
