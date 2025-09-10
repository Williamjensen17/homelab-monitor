export default class BitcoinChartApp {
    constructor(config, element, appManager) {
        this.config = config;
        this.element = element;
        this.appManager = appManager;
        this.intervalId = null;

        // Local state
        this.currentPrice = 0;
        this.priceChange24h = 0;
        this.historicalData = {
            "1h": [],
            "6h": [],
            "12h": [],
            "24h": [],
            "7d": []
        };
        this.isExpanded = false;
        this.selectedTimeframe = "24h";

        // Shared cache (so multiple widgets don’t refetch)
        if (!window._btcCache) {
            window._btcCache = { data: {}, lastFetched: 0, fetching: {} };
        }
    }

    init() {
        this.render();
        this.startUpdates();
    }

    render() {
        this.element.innerHTML = `
            <div class="bitcoin-container">
                <div class="bitcoin-header">
                    <div class="bitcoin-title">₿ Bitcoin</div>
                    <div class="bitcoin-price" id="bitcoin-price">Loading...</div>
                </div>
                <div class="bitcoin-change" id="bitcoin-change">Loading...</div>
                <div class="bitcoin-mini-chart">
                    <canvas id="bitcoin-canvas-mini" width="260" height="100"></canvas>
                </div>
                <div class="click-hint">Click for detailed view</div>
            </div>

            <!-- Expanded -->
            <div class="bitcoin-expanded" style="display:none">
                <div class="expanded-overlay"></div>
                <div class="expanded-content">
                    <div class="expanded-header">
                        <div>
                          <h3>₿ Bitcoin Price Chart</h3>
                          <div class="current-price-large" id="current-price-large">$0</div>
                        </div>
                        <button class="close-expanded">×</button>
                    </div>
                    <div class="timeframe-selector">
                        <button class="timeframe-btn" data-timeframe="1h">1 Hour</button>
                        <button class="timeframe-btn" data-timeframe="6h">6 Hours</button>
                        <button class="timeframe-btn" data-timeframe="12h">12 Hours</button>
                        <button class="timeframe-btn active" data-timeframe="24h">24 Hours</button>
                        <button class="timeframe-btn" data-timeframe="7d">7 Days</button>
                    </div>
                    <div class="chart-info">
                        <div class="timeframe-title">Last 24 Hours</div>
                        <div class="price-range" id="price-range"></div>
                    </div>
                    <canvas id="bitcoin-canvas-expanded" width="800" height="400"></canvas>
                </div>
            </div>
        `;
        this.addStyles();
        this.bindEvents();
    }

    addStyles() {
        const style = document.createElement("style");
        style.textContent = `
        .bitcoin-container {
          background: rgba(20,20,20,0.6);
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
        }
        .bitcoin-title { color:#f7931a; font-weight:bold }
        .bitcoin-price { font-size:1.4em; font-weight:bold; color:#4CAF50 }
        .bitcoin-change { font-size:0.9em }
        .bitcoin-change.positive { color:#4CAF50 }
        .bitcoin-change.negative { color:#f44336 }
        .bitcoin-expanded {
          position:fixed; top:0; left:0; width:100vw; height:100vh;
          display:flex; align-items:center; justify-content:center;
          z-index:9999;
        }
        .expanded-overlay {
          position:absolute; top:0; left:0; width:100%; height:100%;
          background:rgba(0,0,0,0.9);
        }
        .expanded-content {
          position:relative; background:#1a1a1a; padding:20px; border-radius:10px;
          max-width:90vw; max-height:90vh; overflow:auto;
        }
        .close-expanded {
          background:#f44336; border:none; border-radius:50%; color:white;
          width:40px; height:40px; font-size:20px; cursor:pointer;
        }
        .timeframe-selector { display:flex; gap:8px; margin:10px 0 }
        .timeframe-btn.active { background:#4CAF50 }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.element.querySelector(".bitcoin-container").addEventListener("click", () =>
            this.toggleExpanded()
        );
        this.element.querySelector(".close-expanded").addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleExpanded();
        });
        this.element.querySelector(".expanded-overlay").addEventListener("click", () =>
            this.toggleExpanded()
        );
        this.element.querySelectorAll(".timeframe-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.setTimeframe(btn.dataset.timeframe);
            });
        });
    }

    startUpdates() {
        this.fetchAndRender("24h");
        this.intervalId = setInterval(() => {
            this.fetchAndRender(this.selectedTimeframe);
        }, 120000);
    }

    async fetchFromAPI(timeframe = "24h") {
        const cache = window._btcCache;
        const now = Date.now();

        if (cache.data[timeframe] && now - cache.lastFetched < 60000) {
            return cache.data[timeframe];
        }

        if (cache.fetching[timeframe]) {
            return cache.fetching[timeframe];
        }

        // Use CoinCap API (free, CORS enabled)
        let url;
        if (timeframe === "7d") {
            url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1`;
        } else if (timeframe === "24h") {
            url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=h1`;
        } else {
            url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=m15`;
        }

        console.log("🌍 Fetching BTC data for", timeframe);
        const p = fetch(url)
            .then((r) => r.json())
            .then((json) => {
                const series = (json.data || []).map((dp) => ({
                    time: new Date(dp.time),
                    price: parseFloat(dp.priceUsd)
                }));
                cache.data[timeframe] = series;
                cache.lastFetched = now;
                return series;
            })
            .finally(() => {
                cache.fetching[timeframe] = null;
            });

        cache.fetching[timeframe] = p;
        return p;
    }

    async fetchAndRender(timeframe) {
        const series = await this.fetchFromAPI(timeframe);
        if (!series.length) return;

        this.historicalData[timeframe] = series;
        this.currentPrice = series.at(-1).price;

        this.updateDisplay();
        this.drawMiniChart();
        if (this.isExpanded) {
            this.drawExpandedChart();
            this.updateChartInfo();
        }
    }

    updateDisplay() {
        this.element.querySelector("#bitcoin-price").textContent =
            "$" + this.currentPrice.toLocaleString();
        // Recalculate 24h change from 24h history
        const data24h = this.historicalData["24h"];
        if (data24h.length > 1) {
            const first = data24h[0].price;
            const last = data24h.at(-1).price;
            this.priceChange24h = ((last - first) / first) * 100;
        }
        const changeEl = this.element.querySelector("#bitcoin-change");
        changeEl.textContent =
            (this.priceChange24h >= 0 ? "+" : "") +
            this.priceChange24h.toFixed(2) +
            "% (24h)";
        changeEl.className =
            "bitcoin-change " +
            (this.priceChange24h >= 0 ? "positive" : "negative");

        const expanded = this.element.querySelector("#current-price-large");
        if (expanded)
            expanded.textContent = "$" + this.currentPrice.toLocaleString();
    }

    drawMiniChart() {
        const data = this.historicalData["24h"];
        if (!data.length) return;
        const canvas = this.element.querySelector("#bitcoin-canvas-mini");
        this.drawChartOnCanvas(canvas, 260, 100, data, false);
    }

    drawExpandedChart() {
        const data = this.historicalData[this.selectedTimeframe];
        if (!data.length) return;
        const canvas = this.element.querySelector("#bitcoin-canvas-expanded");
        this.drawChartOnCanvas(canvas, 800, 400, data, true);
    }

    drawChartOnCanvas(canvas, width, height, data, showLabels) {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, width, height);

        const prices = data.map((d) => d.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) return;

        const margin = 40;
        const w = width - margin * 2;
        const h = height - margin * 2;

        ctx.beginPath();
        ctx.strokeStyle = "#4CAF50";
        data.forEach((d, i) => {
            const x = margin + (i / (data.length - 1)) * w;
            const y = height - margin - ((d.price - min) / (max - min)) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        if (showLabels) {
            ctx.fillStyle = "#ccc";
            ctx.fillText(`$${max.toFixed(0)}`, width - 5, margin);
            ctx.fillText(`$${min.toFixed(0)}`, width - 5, height - margin);
        }
    }

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.element.querySelector(".bitcoin-expanded").style.display = this.isExpanded
            ? "flex"
            : "none";
        if (this.isExpanded) {
            this.fetchAndRender(this.selectedTimeframe);
        }
    }

    setTimeframe(tf) {
        this.selectedTimeframe = tf;
        this.element
            .querySelectorAll(".timeframe-btn")
            .forEach((btn) =>
                btn.classList.toggle("active", btn.dataset.timeframe === tf)
            );
        this.fetchAndRender(tf);
    }

    updateChartInfo() {
        const data = this.historicalData[this.selectedTimeframe];
        if (!data.length) return;
        const min = Math.min(...data.map((d) => d.price));
        const max = Math.max(...data.map((d) => d.price));
        this.element.querySelector(
            "#price-range"
        ).textContent = `Range: $${min.toFixed(0)} - $${max.toFixed(0)}`;
        this.element.querySelector(".timeframe-title").textContent =
            {
                "1h": "Last 1 Hour",
                "6h": "Last 6 Hours",
                "12h": "Last 12 Hours",
                "24h": "Last 24 Hours",
                "7d": "Last 7 Days"
            }[this.selectedTimeframe];
    }

    destroy() {
        if (this.intervalId) clearInterval(this.intervalId);
    }
}
