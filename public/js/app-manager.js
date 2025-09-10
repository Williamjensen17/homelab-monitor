class AppManager {
    constructor() {
        this.apps = [];
        this.editMode = false;
        this.draggedElement = null;
        this.resizingElement = null;
        this.ws = null;
        
        this.init();
    }
    
    init() {
        this.connectWebSocket();
        this.loadInstalledApps();
        this.bindEvents();
    }
    
    connectWebSocket() {
        this.ws = new WebSocket(`ws://${window.location.hostname}:8080`);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }
    
    handleWebSocketMessage(data) {
        // Handle real-time updates from server
        if (data.type === 'appUpdate') {
            this.updateAppData(data.appId, data.data);
        }
    }
    
    async loadInstalledApps() {
        try {
            const response = await fetch('/api/installed-apps');
            const data = await response.json();
            this.apps = data.apps || [];
            this.renderApps();
        } catch (error) {
            console.error('Failed to load installed apps:', error);
        }
    }
    
    renderApps() {
        const container = document.getElementById('appContainer');
        container.innerHTML = '';
        
        this.apps.forEach(app => {
            const appElement = this.createAppElement(app);
            container.appendChild(appElement);
        });
    }
    
    createAppElement(app) {
        const appEl = document.createElement('div');
        appEl.className = 'app-widget';
        appEl.id = app.id;
        appEl.style.left = `${app.position.x}px`;
        appEl.style.top = `${app.position.y}px`;
        appEl.style.width = `${app.position.width}px`;
        appEl.style.height = `${app.position.height}px`;
        
        appEl.innerHTML = `
            <div class="app-header">
                <div class="app-title">${app.name}</div>
                <button class="app-remove" onclick="appManager.removeApp('${app.id}')">×</button>
            </div>
            <div class="app-content" id="content-${app.id}"></div>
            <div class="resize-handle"></div>
        `;
        
        // Load app-specific content
        this.loadAppContent(app, appEl.querySelector('.app-content'));
        
        return appEl;
    }
    
    async loadAppContent(app, contentElement) {
        try {
            // Dynamically load app-specific JavaScript
            const appModule = await import(`./apps/${app.appId}/app.js`);
            const appInstance = new appModule.default(app.config, contentElement, this);
            appInstance.init();
            
            // Store reference for updates
            contentElement._appInstance = appInstance;
        } catch (error) {
            console.error(`Failed to load app ${app.appId}:`, error);
            contentElement.innerHTML = `<p>Failed to load app: ${app.appId}</p>`;
        }
    }
    
    bindEvents() {
        document.getElementById('editMode').addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        document.getElementById('saveLayout').addEventListener('click', () => {
            this.saveLayout();
        });
        
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Drag and resize events
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    toggleEditMode() {
        this.editMode = !this.editMode;
        
        const widgets = document.querySelectorAll('.app-widget');
        const editTools = document.getElementById('editTools');
        
        if (this.editMode) {
            widgets.forEach(widget => widget.classList.add('edit-mode'));
            editTools.style.display = 'flex';
        } else {
            widgets.forEach(widget => widget.classList.remove('edit-mode'));
            editTools.style.display = 'none';
        }
    }
    
    handleMouseDown(e) {
        if (!this.editMode) return;
        
        if (e.target.classList.contains('resize-handle')) {
            this.resizingElement = e.target.parentElement;
            e.preventDefault();
        } else if (e.target.closest('.app-widget')) {
            this.draggedElement = e.target.closest('.app-widget');
            const rect = this.draggedElement.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }
    
    handleMouseMove(e) {
        if (this.draggedElement) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            this.draggedElement.style.left = `${Math.max(0, x)}px`;
            this.draggedElement.style.top = `${Math.max(0, y)}px`;
        }
        
        if (this.resizingElement) {
            const rect = this.resizingElement.getBoundingClientRect();
            const width = e.clientX - rect.left + 10;
            const height = e.clientY - rect.top + 10;
            
            this.resizingElement.style.width = `${Math.max(200, width)}px`;
            this.resizingElement.style.height = `${Math.max(150, height)}px`;
        }
    }
    
    handleMouseUp() {
        this.draggedElement = null;
        this.resizingElement = null;
    }
    
    async saveLayout() {
        const updates = [];
        
        this.apps.forEach(app => {
            const element = document.getElementById(app.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                updates.push(
                    fetch(`/api/apps/${app.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            position: {
                                x: parseInt(element.style.left),
                                y: parseInt(element.style.top),
                                width: parseInt(element.style.width),
                                height: parseInt(element.style.height)
                            }
                        })
                    })
                );
            }
        });
        
        try {
            await Promise.all(updates);
            this.toggleEditMode();
            alert('Layout saved successfully!');
        } catch (error) {
            alert('Failed to save layout');
        }
    }
    
    async removeApp(appId) {
        if (confirm('Are you sure you want to remove this app?')) {
            try {
                await fetch(`/api/apps/${appId}`, { method: 'DELETE' });
                this.loadInstalledApps();
            } catch (error) {
                alert('Failed to remove app');
            }
        }
    }
    
    updateAppData(appId, data) {
        const contentElement = document.querySelector(`#content-${appId}`);
        if (contentElement && contentElement._appInstance) {
            contentElement._appInstance.updateData(data);
        }
    }
}

// Global instance
const appManager = new AppManager();
