export default class BitcoinChartApp {
    constructor(config, element, appManager) {
        this.config = config;
        this.element = element;
        this.appManager = appManager;
        this.intervalId = null;
        this.currentPrice = 0;
        this.priceHistory = [];
        this.isExpanded = false;
        this.selectedTimeframe = '1h';
    }
    
    init() {
        this.render();
        this.fetchInitialData();
        this.startUpdates();
    }
    
    render() {
        this.element.innerHTML = `
            <div class="bitcoin-container">
                <div class="bitcoin-header">
                    <div class="bitcoin-title">₿ Bitcoin</div>
                    <div class="bitcoin-price" id="bitcoin-price">Loading...</div>
                </div>
                <div class="bitcoin-change" id="bitcoin-change"></div>
                <div class="bitcoin-chart" id="bitcoin-chart">
                    <canvas id="bitcoin-canvas" width="250" height="100"></canvas>
                </div>
            </div>
            
            <div class="bitcoin-expanded" id="bitcoin-expanded" style="display: none;">
                <div class="expanded-header">
                    <h3>Bitcoin Price Chart</h3>
                    <button class="close-expanded">×</button>
                </div>
                <div class="timeframe-selector">
                    <button class="timeframe-btn active" data-timeframe="1h">1H</button>
                    <button class="timeframe-btn" data-timeframe="6h">6H</button>
                    <button class="timeframe-btn" data-timeframe="12h">12H</button>
                    <button class="timeframe-btn" data-timeframe="24h">24H</button>
                </div>
                <div class="expanded-chart">
                    <canvas id="bitcoin-canvas-expanded" width="700" height="400"></canvas>
                </div>
            </div>
        `;
        
        this.addStyles();
        this.bindEvents();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bitcoin-container {
                cursor: pointer;
                padding: 10px;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .bitcoin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .bitcoin-title {
                font-weight: bold;
                color: #f7931a;
            }
            .bitcoin-price {
                font-size: 1.2em;
                font-weight: bold;
                color: #4CAF50;
            }
            .bitcoin-change {
                font-size: 0.9em;
                margin-bottom: 10px;
            }
            .bitcoin-change.positive {
                color: #4CAF50;
            }
            .bitcoin-change.negative {
                color: #f44336;
            }
            .bitcoin-chart {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .bitcoin-expanded {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                z-index: 3000;
                padding: 20px;
            }
            .expanded-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .close-expanded {
                background: #f44336;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-size: 20px;
            }
            .timeframe-selector {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            .timeframe-btn {
                padding: 8px 15px;
                background: #333;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            .timeframe-btn.active {
                background: #4CAF50;
            }
            .expanded-chart {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // Click to expand
        this.element.querySelector('.bitcoin-container').addEventListener('click', () => {
            this.toggleExpanded();
        });
        
        // Close expanded view
        this.element.querySelector('.close-expanded').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExpanded();
        });
        
        // Timeframe buttons
        this.element.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTimeframe(btn.dataset.timeframe);
            });
        });
    }
    
    async fetchInitialData() {
        try {
            // Fetch current price from CoinGecko (more reliable)
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            
            this.currentPrice = data.bitcoin.usd;
            this.priceChange24h = data.bitcoin.usd_24h_change;
            
            await this.fetchHistoricalData();
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to fetch Bitcoin data:', error);
            this.element.querySelector('#bitcoin-price').textContent = 'Error loading data';
        }
    }
    
    async fetchHistoricalData(timeframe = '1h') {
        try {
            const hours = {
                '1h': 1,
                '6h': 6,
                '12h': 12,
                '24h': 24
            }[timeframe] || 1;
            
            const days = hours / 24;
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`
            );
            const data = await response.json();
            
            this.priceHistory = data.prices.map(([timestamp, price]) => ({
                time: new Date(timestamp),
                price: price
            }));
            
            this.drawChart();
        } catch (error) {
            console.error('Failed to fetch historical data:', error);
        }
    }
    
    updateDisplay() {
        const priceElement = this.element.querySelector('#bitcoin-price');
        const changeElement = this.element.querySelector('#bitcoin-change');
        
        if (priceElement) {
            priceElement.textContent = `$${this.currentPrice.toLocaleString()}`;
        }
        
        if (changeElement && this.priceChange24h !== undefined) {
            const change = this.priceChange24h;
            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElement.className = `bitcoin-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    drawChart() {
        const canvas = this.element.querySelector('#bitcoin-canvas');
        const expandedCanvas = this.element.querySelector('#bitcoin-canvas-expanded');
        
        if (this.priceHistory.length > 0) {
            this.drawChartOnCanvas(canvas, 250, 100);
            if (expandedCanvas && this.isExpanded) {
                this.drawChartOnCanvas(expandedCanvas, 700, 400);
            }
        }
    }
    
    drawChartOnCanvas(canvas, width, height) {
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        
        if (this.priceHistory.length < 2) return;
        
        const prices = this.priceHistory.map(item => item.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        if (priceRange === 0) return;
        
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.priceHistory.forEach((item, index) => {
            const x = (index / (this.priceHistory.length - 1)) * (width - 40) + 20;
            const y = height - 20 - ((item.price - minPrice) / priceRange) * (height - 40);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw price labels
        ctx.fillStyle = '#ccc';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`$${maxPrice.toFixed(0)}`, width - 5, 15);
        ctx.fillText(`$${minPrice.toFixed(0)}`, width - 5, height - 5);
    }
    
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        const expandedElement = this.element.querySelector('#bitcoin-expanded');
        
        if (this.isExpanded) {
            expandedElement.style.display = 'block';
            this.fetchHistoricalData(this.selectedTimeframe);
        } else {
            expandedElement.style.display = 'none';
        }
    }
    
    setTimeframe(timeframe) {
        this.selectedTimeframe = timeframe;
        
        // Update button states
        const buttons = this.element.querySelectorAll('.timeframe-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === timeframe) {
                btn.classList.add('active');
            }
        });
        
        this.fetchHistoricalData(timeframe);
    }
    
    startUpdates() {
        this.intervalId = setInterval(() => {
            this.fetchInitialData();
        }, this.config.updateInterval);
    }
    
    updateData(data) {
        // Handle WebSocket updates if needed
    }
    
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
