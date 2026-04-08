import os
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv

def check_unread():
    load_dotenv()
    email_addr = os.getenv("GMAIL_ADDRESS")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email_addr or not app_password:
        return

    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(email_addr, app_password)
    mail.select("INBOX")
    
    status, data = mail.search(None, "UNSEEN")
    msg_ids = data[0].split()
    
    print(f"Found {len(msg_ids)} unread messages:")
    for m_id in msg_ids:
        status, msg_data = mail.fetch(m_id, "(RFC822)")
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        subject = decode_header(msg.get("Subject"))[0][0]
        if isinstance(subject, bytes):
            subject = subject.decode()
        
        from_ = msg.get("From")
        print(f" - From: {from_} | Subject: {subject}")
    
    mail.close()
    mail.logout()

if __name__ == "__main__":
    check_unread()
