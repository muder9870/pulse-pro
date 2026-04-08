import os
import logging
from dotenv import load_dotenv
from backend.fetchers.gmail_fetcher_smart import SmartGmailFetcher
from backend.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def test_gmail():
    load_dotenv()
    
    email_addr = os.getenv("GMAIL_ADDRESS")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email_addr or not app_password:
        print("Missing GMAIL_ADDRESS or GMAIL_APP_PASSWORD in .env")
        return

    print(f"Connecting to Gmail: {email_addr}...")
    init_db()
    
    fetcher = SmartGmailFetcher(email_addr=email_addr, app_password=app_password)
    try:
        fetcher.connect()
        print("Connected!")
        
        print("\n--- Phase 1: Discovering Senders ---")
        discovered = fetcher.discover_newsletters(max_messages=20)
        print(f"Discovered {discovered} new senders.")
        
        print("\n--- Phase 2: Fetching Articles ---")
        # seed some known ones for test
        seed = ["info@metricool.com", "noreply@medium.com"]
        inserted = fetcher.fetch_newsletters(additional_senders=seed)
        print(f"Inserted {inserted} new articles from Gmail.")
        
        print("\n--- Current Sender Stats ---")
        stats = fetcher.get_sender_stats()
        for s in stats:
            print(f"- {s['sender_email']} ({s['sender_name']}): {s['message_count']} msgs, confidence: {s['confidence_score']}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        fetcher.close()

if __name__ == "__main__":
    test_gmail()
