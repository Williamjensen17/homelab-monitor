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
            <div class="bitcoin-container" onclick="bitcoinChart.toggleExpanded()">
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
                    <button class="close-expanded" onclick="bitcoinChart.toggleExpanded()">×</button>
                </div>
                <div class="timeframe-selector">
                    <button onclick="bitcoinChart.setTimeframe('1h')" class="timeframe-btn active">1H</button>
                    <button onclick="bitcoinChart.setTimeframe('6h')" class="timeframe-btn">6H</button>
                    <button onclick="bitcoinChart.setTimeframe('12h')" class="timeframe-btn">12H</button>
                    <button onclick="bitcoinChart.setTimeframe('24h')" class="timeframe-btn">24H</button>
                </div>
                <div class="expanded-chart">
                    <canvas id="bitcoin-canvas-expanded" width="700" height="400"></canvas>
                </div>
            </div>
            
            <style>
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
            </style>
        `;
        
        // Make this instance globally accessible for onclick handlers
        window.bitcoinChart = this;
    }
    
    async fetchInitialData() {
        try {
            // Fetch current price
            const priceResponse = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
            const priceData = await priceResponse.json();
            this.currentPrice = parseFloat(priceData.bpi.USD.rate.replace(',', ''));
            
            // Fetch historical data for chart
            await this.fetchHistoricalData();
            
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to fetch Bitcoin data:', error);
            this.element.querySelector('#bitcoin-price').textContent = 'Error loading data';
        }
    }
    
    async fetchHistoricalData(timeframe = '1h') {
        try {
            // Using a different API for historical data (CoinGecko)
            const hours = {
                '1h': 1,
                '6h': 6,
                '12h': 12,
                '24h': 24
            }[timeframe] || 1;
            
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${hours/24}&interval=hourly`
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
        
        if (changeElement && this.priceHistory.length > 1) {
            const oldPrice = this.priceHistory[0].price;
            const change = this.currentPrice - oldPrice;
            const changePercent = ((change / oldPrice) * 100);
            
            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
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
            if (btn.textContent === timeframe.toUpperCase()) {
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
        if (window.bitcoinChart === this) {
            delete window.bitcoinChart;
        }
    }
}
