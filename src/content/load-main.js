// Content script that injects the main script into Spotify's page
console.log("hello from load-main.js");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/injected/main.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.source === 'popup') {
        // Forward the message to the injected script
        window.postMessage({
            action: request.action,
            source: 'content-script'
        }, '*');
        
        sendResponse({status: 'Message forwarded to injected script'});
    }
});

// Listen for responses from injected script
window.addEventListener('message', function(event) {
    if (event.data.source === 'injected-script') {
        console.log('Response from injected script:', event.data);
    }
});
