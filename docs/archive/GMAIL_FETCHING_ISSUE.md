# Gmail Fetching Issue - Root Cause Analysis

## 🔴 The Problem

Gmail data is **not being fetched** because the configured label "Pulse Pro" is **empty** (0 messages).

## ✅ What's Working

- ✅ Gmail credentials are correctly configured in `.env`
- ✅ IMAP connection to Gmail is successful
- ✅ The "Pulse Pro" label exists in Gmail
- ✅ The label has 9 sub-labels with emails:
  - `Pulse Pro/AI Leaderboard`
  - `Pulse Pro/IFTTT`
  - `Pulse Pro/Medium`
  - `Pulse Pro/Medium/Daily Digest`
  - `Pulse Pro/Metricool`
  - `Pulse Pro/Postman`
  - `Pulse Pro/Supermemory`
  - `Pulse Pro/ZDNET News Alerts`
  - `Pulse Pro/ZDNET Tech Today`

## ❌ The Issue

**The parent label "Pulse Pro" itself contains 0 messages.**

All emails are in the **sub-labels**, but the fetcher is only looking in the parent label.

### How the Fetcher Works

From `backend/fetchers/gmail_fetcher_smart.py` lines 236-290:

```python
def fetch_newsletters(self, additional_senders: Iterable[str] | None = None) -> int:
    """Fetch newsletters from known senders + any additional senders."""
    
    label = settings.GMAIL_LABEL  # "Pulse Pro"
    
    if label:
        inserted_total += self._fetch_from_label(label)  # Only searches "Pulse Pro"
    else:
        # Falls back to INBOX
        self.conn.select("INBOX")
```

## 🔧 Solutions

### Option 1: Use INBOX instead of "Pulse Pro" (Recommended)
```env
# Remove or comment out GMAIL_LABEL
# GMAIL_LABEL=Pulse Pro
```
The fetcher will then search the entire INBOX including all labels.

### Option 2: Move emails to parent label
Move some emails from sub-labels directly into the "Pulse Pro" parent label.

### Option 3: Fix the sub-label detection in code
Modify `_fetch_from_label()` to properly handle sub-labels (requires code change).

### Option 4: Configure fetcher to search specific sub-labels
Set `GMAIL_LABEL` to one of the sub-labels like:
```env
GMAIL_LABEL=Pulse Pro/AI Leaderboard
```

## 📋 Recommended Fix

**Use Option 1** - Leave `GMAIL_LABEL` empty or commented out.

Why?
- Simplest solution
- No manual email organization needed
- Fetcher will discover newsletters automatically
- Will work with emails from any sender

Edit `.env`:
```env
# Gmail (IMAP newsletter fetching)
GMAIL_ADDRESS=museforge.studio1@gmail.com
GMAIL_APP_PASSWORD=chaf bfsw reap wule

# Leave empty to search INBOX and discover newsletters automatically
# GMAIL_LABEL=
```

Then restart the pipeline:
1. Go to Dashboard
2. Click "Run Pipeline" button
3. Monitor the logs to verify emails are being fetched

## 📊 What Will Happen

When `GMAIL_LABEL` is empty:
1. Fetcher will search `INBOX` (which includes all labels in Gmail)
2. It will discover AI-related newsletters automatically
3. Extract links from emails
4. Save them to the database as articles with source=`gmail`

## 🔍 Verification

After fixing, check if emails are being fetched:
1. Run the pipeline again
2. Check logs: `stage=fetch source=gmail inserted=X` (should be > 0)
3. Check Dashboard → Articles view for emails from Gmail senders

---

**Last Verified:** 2026-05-15  
**Status:** Root cause identified ✅
