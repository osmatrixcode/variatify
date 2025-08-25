// Popup script to handle button clicks and communicate with content script

document.addEventListener('DOMContentLoaded', function() {
    // Get button elements
    const speedUpBtn = document.getElementById('speedUpId');
    const normalSpeedBtn = document.getElementById('normalSpeedId');
    const slowedBtn = document.getElementById('slowedId');
    const slowedReverbBtn = document.getElementById('slowedReverbId');

    // Add event listeners
    speedUpBtn.addEventListener('click', function() {
        sendMessageToContentScript('speedUp');
    });

    normalSpeedBtn.addEventListener('click', function() {
        sendMessageToContentScript('normalSpeed');
    });

    slowedBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowed');
    });

    slowedReverbBtn.addEventListener('click', function() {
        sendMessageToContentScript('slowedReverb');
    });
});

function sendMessageToContentScript(action) {
    // Get the active tab and send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        
        chrome.tabs.sendMessage(activeTab.id, {
            action: action,
            source: 'popup'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
            } else {
                console.log('Message sent successfully:', response);
            }
        });
    });
}
