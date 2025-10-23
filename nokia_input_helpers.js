// ✅ HELPER FUNCTION: Get active input reference
// Returns either global currentInput (for ChatGPT) or Messages.messageInput
window.getActiveInput = function() {
    // Check if Messages is active
    if (window.nokiaMessages && 
        window.nokiaMessages.isActive && 
        window.nokiaMessages.viewMode === 'conversation' &&
        !window.nokiaMessages.settingsOpen &&
        !window.messagesNewDialogActive) {
        return {
            text: window.nokiaMessages.messageInput,
            cursor: window.nokiaMessages.messageCursor,
            isMessages: true
        };
    }
    
    // Default: ChatGPT
    return {
        text: window.currentInput,
        cursor: window.cursorPosition,
        isMessages: false
    };
};

// ✅ HELPER FUNCTION: Set active input
window.setActiveInput = function(text, cursor) {
    // Check if Messages is active
    if (window.nokiaMessages && 
        window.nokiaMessages.isActive && 
        window.nokiaMessages.viewMode === 'conversation' &&
        !window.nokiaMessages.settingsOpen &&
        !window.messagesNewDialogActive) {
        window.nokiaMessages.messageInput = text;
        window.nokiaMessages.messageCursor = cursor;
        window.nokiaMessages.syncInputDisplay();
    } else {
        // ChatGPT
        window.currentInput = text;
        window.cursorPosition = cursor;
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
    }
};
