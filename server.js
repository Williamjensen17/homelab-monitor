const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const WebSocket = require('ws');

const app = express();
const PORT = 80;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

// Serve installed apps
app.get('/api/installed-apps', async (req, res) => {
  try {
    const data = await fs.readFile('config/installed-apps.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json({ apps: [] });
  }
});

// Get available apps
app.get('/api/available-apps', async (req, res) => {
  try {
    const files = await fs.readdir('apps-available');
    const apps = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(`apps-available/${file}`, 'utf8');
        apps.push(JSON.parse(data));
      }
    }
    
    res.json({ apps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load available apps' });
  }
});

// Install app
app.post('/api/install-app/:appId', async (req, res) => {
  const { appId } = req.params;
  const { config } = req.body;
  
  try {
    // Read app definition
    const appData = await fs.readFile(`apps-available/${appId}.json`, 'utf8');
    const appDef = JSON.parse(appData);
    
    // Read current installed apps
    let installedApps = { apps: [] };
    try {
      const data = await fs.readFile('config/installed-apps.json', 'utf8');
      installedApps = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    // Add new app instance
    const newApp = {
      id: `${appId}-${Date.now()}`,
      appId: appId,
      name: appDef.name,
      config: { ...appDef.defaultConfig, ...config },
      position: { x: 0, y: 0, width: 300, height: 200 }
    };
    
    installedApps.apps.push(newApp);
    
    // Save updated config
    await fs.writeFile('config/installed-apps.json', 
      JSON.stringify(installedApps, null, 2));
    
    res.json({ success: true, app: newApp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to install app' });
  }
});

// Update app config
app.put('/api/apps/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  const updates = req.body;
  
  try {
    const data = await fs.readFile('config/installed-apps.json', 'utf8');
    const installedApps = JSON.parse(data);
    
    const appIndex = installedApps.apps.findIndex(app => app.id === instanceId);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    installedApps.apps[appIndex] = { ...installedApps.apps[appIndex], ...updates };
    
    await fs.writeFile('config/installed-apps.json', 
      JSON.stringify(installedApps, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// Remove app
app.delete('/api/apps/:instanceId', async (req, res) => {
  const { instanceId } = req.params;
  
  try {
    const data = await fs.readFile('config/installed-apps.json', 'utf8');
    const installedApps = JSON.parse(data);
    
    installedApps.apps = installedApps.apps.filter(app => app.id !== instanceId);
    
    await fs.writeFile('config/installed-apps.json', 
      JSON.stringify(installedApps, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove app' });
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Broadcast function for real-time updates
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Homelab Monitor running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on port 8080`);
});

// Export broadcast function for apps
module.exports = { broadcast };
