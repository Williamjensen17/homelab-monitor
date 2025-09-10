class AppStore {
    constructor(appManager) {
        this.appManager = appManager;
        this.modal = document.getElementById('appStoreModal');
        this.init();
    }
    
    init() {
        document.getElementById('appStore').addEventListener('click', () => {
            this.showAppStore();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            this.hideAppStore();
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideAppStore();
            }
        });
    }
    
    async showAppStore() {
        await this.loadAvailableApps();
        this.modal.style.display = 'block';
    }
    
    hideAppStore() {
        this.modal.style.display = 'none';
    }
    
    async loadAvailableApps() {
        try {
            const response = await fetch('/api/available-apps');
            const data = await response.json();
            this.renderAvailableApps(data.apps);
        } catch (error) {
            console.error('Failed to load available apps:', error);
        }
    }
    
    renderAvailableApps(apps) {
        const container = document.getElementById('availableApps');
        container.innerHTML = '';
        
        apps.forEach(app => {
            const appCard = document.createElement('div');
            appCard.className = 'app-card';
            appCard.innerHTML = `
                <div class="app-info">
                    <h3>${app.name}</h3>
                    <p>${app.description}</p>
                    <small>Version: ${app.version}</small>
                </div>
                <button class="install-btn" onclick="appStore.installApp('${app.id}')">
                    Install
                </button>
            `;
            container.appendChild(appCard);
        });
    }
    
    async installApp(appId) {
        try {
            const response = await fetch(`/api/install-app/${appId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: {} })
            });
            
            if (response.ok) {
                alert('App installed successfully!');
                this.hideAppStore();
                await this.appManager.loadInstalledApps();
            } else {
                alert('Failed to install app');
            }
        } catch (error) {
            console.error('Failed to install app:', error);
            alert('Failed to install app');
        }
    }
}
