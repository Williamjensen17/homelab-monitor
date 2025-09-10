// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Homelab Monitor initializing...');
    
    // Initialize app store when page loads
    window.appStore = new AppStore(appManager);
    
    console.log('App Store initialized');
    
    // Add any other global initialization here
    setupGlobalEventHandlers();
});

function setupGlobalEventHandlers() {
    // Handle escape key to exit edit mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && appManager.editMode) {
            appManager.toggleEditMode();
        }
    });
    
    // Prevent context menu in kiosk mode (optional)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Handle window resize for responsive layout
    window.addEventListener('resize', () => {
        // Could add logic to adjust app positions on screen resize
        console.log('Window resized');
    });
}

// Global error handler for unhandled errors
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

console.log('Main.js loaded successfully');
