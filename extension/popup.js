document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const captureBtn = document.getElementById('captureBtn');
    const messageEl = document.getElementById('message');

    console.log('Pulse Pro Extension: Initializing...');

    // Helper to show message
    const showMessage = (text, isError = false) => {
        messageEl.textContent = text;
        messageEl.className = isError ? 'error' : 'success';
        messageEl.style.display = 'block';
    };

    if (typeof chrome === 'undefined' || !chrome.tabs) {
        statusEl.innerText = 'Error: Chrome API not available. Are you running this as an extension?';
        return;
    }

    try {
        // Get current tab info
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        if (!tab) {
            statusEl.innerText = 'No active tab found. Please click the extension icon while on a website.';
            captureBtn.disabled = true;
            return;
        }

        // Check for internal chrome pages
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            statusEl.innerText = 'Cannot capture content from internal browser pages. Go to an article to use the extension.';
            captureBtn.disabled = true;
            return;
        }

        statusEl.innerText = `Article: ${tab.title}\n\nURL: ${tab.url}`;

        captureBtn.addEventListener('click', async () => {
            captureBtn.disabled = true;
            statusEl.innerText = 'Capturing...';
            messageEl.style.display = 'none';

            try {
                // Extract content using scripting API
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Simple content extraction logic
                        const paragraphs = Array.from(document.querySelectorAll('p'))
                            .map(p => p.innerText.trim())
                            .filter(text => text.length > 50);
                        return paragraphs.join('\n\n');
                    }
                });

                const result = results[0]?.result;

                // Send to backend
                const response = await fetch('http://localhost:5000/api/extension/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: tab.url,
                        title: tab.title,
                        content: result || '',
                        category: 'Browser Capture'
                    })
                });

                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await response.json();
                    if (response.ok) {
                        statusEl.innerText = 'Saved successfully!';
                        showMessage(data.message || 'Article saved to Pulse Pro.');
                    } else {
                        throw new Error(data.error || `Server Error: ${response.status}`);
                    }
                } else {
                    // It's not JSON, probably an HTML error page or 404
                    const text = await response.text();
                    console.error('Pulse Pro Extension: Received non-JSON response', text);
                    if (response.status === 404) {
                        throw new Error('Capture API not found (404). Please ensure the Pulse Pro backend is updated and running.');
                    } else {
                        throw new Error(`Unexpected response from server (${response.status}). Check backend logs.`);
                    }
                }
            } catch (err) {
                statusEl.innerText = 'Capture Failed';
                showMessage(err.message, true);
                captureBtn.disabled = false;
            }
        });

    } catch (err) {
        console.error('Pulse Pro Extension Error:', err);
        statusEl.innerText = 'Initialization Error';
        showMessage(err.message, true);
        captureBtn.disabled = true;
    }
});
