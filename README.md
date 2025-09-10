# Homelab Monitor

🚀 A modular homelab monitoring dashboard  
Runs as a kiosk‑friendly webserver on **port 80** with a touch‑display UI.  
Apps are installed via an integrated **App Store** for peak performance and easy scalability.

---

## ✨ Features
- 📟 Base dashboard running on Node.js + Express
- 🖼️ Touch display kiosk‑friendly interface
- 🧩 Modular **App System**  
  - Install/remove apps on demand  
  - Drag, resize, and edit layout  
  - Save multiple layouts easily
- ⚡ Real‑time data via WebSockets
- 🔄 Easy install & upgrade scripts

---

## 🛠 Installation

> ⚠️ Requires **Node.js (>=18)** and `git`.

Run this in your terminal (on your homelab box or VM):

```bash
bash <(curl -s https://raw.githubusercontent.com/Williamjensen17/homelab-monitor/main/install.sh)
```

This will:
- Clone the repo
- Install Node.js dependencies
- Create initial config
- Register a **systemd service** (`homelab-monitor.service`)  
- Start the webserver on **port 80** and WebSocket on **8080**

Then just open:  
👉 `http://<your-server-ip>/`

---

## 🔄 Upgrade

To upgrade to the latest build:

```bash
bash <(curl -s https://raw.githubusercontent.com/Williamjensen17/homelab-monitor/main/upgrade.sh)
```

---

## 📦 Apps

Apps are modular and optional.  
See [APPS.md](APPS.md) for documentation on available apps.

- ✅ **Clock App** — simple digital clock
- ✅ **Bitcoin Graph App** — shows live BTC price chart
- 🔜 More apps coming soon...

---

## 🔌 Systemd management

```bash
# Check service status
sudo systemctl status homelab-monitor

# Restart service
sudo systemctl restart homelab-monitor
```

---

## 🖥️ Development

```bash
git clone https://github.com/Williamjensen17/homelab-monitor.git
cd homelab-monitor
npm install
npm run dev   # runs with nodemon auto-restart
```

---

## 📜 License

MIT License
