export default class BitcoinChartApp {
    constructor(config, element, appManager) {
        this.config = config;
        this.element = element;
        this.appManager = appManager;
        this.intervalId = null;
        this.currentPrice = 0;
        this.priceChange24h = 0;
        this.historicalData = {
            '1h': [],
            '6h': [],
            '12h': [],
            '24h': [],
            '7d': []
        };
        this.isExpanded = false;
        this.selectedTimeframe = '24h';
    }
    
    init() {
        this.render();
        this.fetchAllData();
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
                <div class="bitcoin-mini-chart" id="bitcoin-mini-chart">
                    <canvas id="bitcoin-canvas-mini" width="260" height="100"></canvas>
                </div>
                <div class="click-hint">Click for detailed view</div>
            </div>
            
            <div class="bitcoin-expanded" id="bitcoin-expanded" style="display: none;">
                <div class="expanded-overlay"></div>
                <div class="expanded-content">
                    <div class="expanded-header">
                        <div class="expanded-title">
                            <h3>₿ Bitcoin Price Chart</h3>
                            <div class="current-price-large" id="current-price-large">$${this.currentPrice.toLocaleString()}</div>
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
                    <div class="chart-info" id="chart-info">
                        <div class="timeframe-title">Last 24 Hours</div>
                        <div class="price-range" id="price-range"></div>
                    </div>
                    <div class="expanded-chart">
                        <canvas id="bitcoin-canvas-expanded" width="800" height="400"></canvas>
                    </div>
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
                padding: 15px;
                height: 100%;
                display: flex;
                flex-direction: column;
                border-radius: 8px;
                background: linear-gradient(135deg, rgba(247, 147, 26, 0.1), rgba(76, 175, 80, 0.1));
                transition: all 0.3s ease;
            }
            .bitcoin-container:hover {
                background: linear-gradient(135deg, rgba(247, 147, 26, 0.15), rgba(76, 175, 80, 0.15));
                transform: translateY(-2px);
            }
            .bitcoin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .bitcoin-title {
                font-weight: bold;
                color: #f7931a;
                font-size: 1.1em;
            }
            .bitcoin-price {
                font-size: 1.4em;
                font-weight: bold;
                color: #4CAF50;
                text-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
            }
            .bitcoin-change {
                font-size: 1em;
                margin-bottom: 10px;
                font-weight: 500;
            }
            .bitcoin-change.positive {
                color: #4CAF50;
            }
            .bitcoin-change.negative {
                color: #f44336;
            }
            .bitcoin-mini-chart {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 8px;
                min-height: 100px;
            }
            .click-hint {
                text-align: center;
                color: #888;
                font-size: 0.8em;
                font-style: italic;
            }
            .bitcoin-expanded {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .expanded-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(5px);
            }
            .expanded-content {
                position: relative;
                background: #1a1a1a;
                border-radius: 15px;
                padding: 30px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }
            .expanded-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 25px;
            }
            .expanded-title h3 {
                margin: 0 0 10px 0;
                color: #f7931a;
                font-size: 1.8em;
            }
            .current-price-large {
                font-size: 2.5em;
                font-weight: bold;
                color: #4CAF50;
                text-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
            }
            .close-expanded {
                background: #f44336;
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                cursor: pointer;
                font-size: 28px;
                transition: all 0.3s ease;
                position: relative;
                z-index: 10000;
                flex-shrink: 0;
                margin-left: 20px;
            }
            .close-expanded:hover {
                background: #d32f2f;
                transform: scale(1.1);
            }
            .timeframe-selector {
                display: flex;
                gap: 12px;
                margin-bottom: 25px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .timeframe-btn {
                padding: 12px 20px;
                background: #333;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.95em;
                transition: all 0.3s ease;
                min-width: 90px;
            }
            .timeframe-btn:hover {
                background: #555;
                transform: translateY(-2px);
            }
            .timeframe-btn.active {
                background: #4CAF50;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            }
            .chart-info {
                text-align: center;
                margin-bottom: 20px;
            }
            .timeframe-title {
                font-size: 1.3em;
                color: #4CAF50;
                margin-bottom: 5px;
            }
            .price-range {
                color: #ccc;
                font-size: 1em;
            }
            .expanded-chart {
                display: flex;
                justify-content: center;
                align-items: center;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 20px;
            }
            #bitcoin-canvas-mini {
                border-radius: 5px;
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        // Click to expand
        this.element.querySelector('.bitcoin-container').addEventListener('click', () => {
            this.toggleExpanded();
        });
        
        // Close expanded view - multiple ways
        const expandedEl = this.element.querySelector('#bitcoin-expanded');
        
        // Click close button
        this.element.querySelector('.close-expanded').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExpanded();
        });
        
        // Click overlay to close
        this.element.querySelector('.expanded-overlay').addEventListener('click', () => {
            this.toggleExpanded();
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.toggleExpanded();
            }
        });
        
        // Timeframe buttons
        this.element.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTimeframe(btn.dataset.timeframe);
            });
        });
    }
    
    async fetchAllData() {
        try {
            console.log('Fetching Bitcoin data...');
            
            // Fetch current price and 24h change
            const currentResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
            const currentData = await currentResponse.json();
            
            this.currentPrice = currentData.bitcoin.usd;
            this.priceChange24h = currentData.bitcoin.usd_24h_change;
            
            console.log(`Current BTC price: $${this.currentPrice}`);
            
            // Fetch historical data - start with 24h for mini chart
            await this.fetchHistoricalData('24h');
            
            this.updateDisplay();
            this.drawMiniChart();
            
            // Load other timeframes in background
            setTimeout(async () => {
                await Promise.all([
                    this.fetchHistoricalData('1h'),
                    this.fetchHistoricalData('6h'),
                    this.fetchHistoricalData('12h'),
                    this.fetchHistoricalData('7d')
                ]);
                
                if (this.isExpanded) {
                    this.drawExpandedChart();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Failed to fetch Bitcoin data:', error);
            this.element.querySelector('#bitcoin-price').textContent = 'Error loading data';
        }
    }
    
    async fetchHistoricalData(timeframe) {
        try {
            const intervals = {
                '1h': { days: '1', interval: 'minutely', points: 60 },
                '6h': { days: '1', interval: 'hourly', points: 6 },
                '12h': { days: '1', interval: 'hourly', points: 12 },
                '24h': { days: '2', interval: 'hourly', points: 24 },
                '7d': { days: '7', interval: 'daily', points: 7 }
            };
            
            const config = intervals[timeframe];
            
            // For 7 days, we need different API call
            let url;
            if (timeframe === '7d') {
                url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily`;
            } else {
                url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${config.days}&interval=${config.interval}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Get the appropriate data points based on timeframe
            let prices;
            if (timeframe === '7d') {
                prices = data.prices; // All 7 days
            } else {
                prices = data.prices.slice(-config.points);
            }
            
            this.historicalData[timeframe] = prices.map(([timestamp, price]) => ({
                time: new Date(timestamp),
                price: price
            }));
            
            console.log(`Fetched ${timeframe} data:`, this.historicalData[timeframe].length, 'points');
            
        } catch (error) {
            console.error(`Failed to fetch ${timeframe} data:`, error);
        }
    }
    
    updateDisplay() {
        const priceElement = this.element.querySelector('#bitcoin-price');
        const changeElement = this.element.querySelector('#bitcoin-change');
        const largePriceElement = this.element.querySelector('#current-price-large');
        
        if (priceElement) {
            priceElement.textContent = `$${this.currentPrice.toLocaleString()}`;
        }
        
        if (largePriceElement) {
            largePriceElement.textContent = `$${this.currentPrice.toLocaleString()}`;
        }
        
        if (changeElement && this.priceChange24h !== undefined) {
            const change = this.priceChange24h;
            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}% (24h)`;
            changeElement.className = `bitcoin-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    drawMiniChart() {
        const canvas = this.element.querySelector('#bitcoin-canvas-mini');
        if (!canvas) return;
        
        // Use 24h data for mini chart
        const data = this.historicalData['24h'];
        if (data.length < 2) return;
        
        this.drawChartOnCanvas(canvas, 260, 100, data, false);
    }
    
    drawExpandedChart() {
        const canvas = this.element.querySelector('#bitcoin-canvas-expanded');
        if (!canvas) return;
        
        const data = this.historicalData[this.selectedTimeframe];
        if (data.length < 2) return;
        
        this.drawChartOnCanvas(canvas, 800, 400, data, true);
    }
    
    drawChartOnCanvas(canvas, width, height, data, showLabels = false) {
        if (!canvas || !data || data.length < 2) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        
        const prices = data.map(item => item.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        if (priceRange === 0) return;
        
        const margin = showLabels ? 60 : 10;
        const chartWidth = width - (margin * 2);
        const chartHeight = height - (margin * 2);
        
        // Draw grid lines (only on expanded chart)
        if (showLabels) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            
            // Horizontal grid lines
            for (let i = 0; i <= 4; i++) {
                const y = margin + (chartHeight * i / 4);
                ctx.beginPath();
                ctx.moveTo(margin, y);
                ctx.lineTo(width - margin, y);
                ctx.stroke();
            }
            
            // Vertical grid lines
            for (let i = 0; i <= 6; i++) {
                const x = margin + (chartWidth * i / 6);
                ctx.beginPath();
                ctx.moveTo(x, margin);
                ctx.lineTo(x, height - margin);
                ctx.stroke();
            }
        }
        
        // Draw price line
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const isPositive = lastPrice >= firstPrice;
        
        ctx.strokeStyle = isPositive ? '#4CAF50' : '#f44336';
        ctx.lineWidth = showLabels ? 3 : 2;
        ctx.beginPath();
        
        data.forEach((item, index) => {
            const x = margin + (index / (data.length - 1)) * chartWidth;
            const y = height - margin - ((item.price - minPrice) / priceRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw price labels (only on expanded chart)
        if (showLabels) {
            ctx.fillStyle = '#ccc';
            ctx.font = '14px Arial';
            ctx.textAlign = 'right';
            
            // Y-axis labels (prices)
            for (let i = 0; i <= 4; i++) {
                const price = minPrice + (priceRange * (4 - i) / 4);
                const y = margin + (chartHeight * i / 4) + 5;
                ctx.fillText(`$${price.toFixed(0)}`, margin - 10, y);
            }
            
            // X-axis labels (times)
            ctx.textAlign = 'center';
            for (let i = 0; i <= 6; i++) {
                if (i < data.length) {
                    const dataIndex = Math.floor(i * (data.length - 1) / 6);
                    const dataPoint = data[dataIndex];
                    const x = margin + (chartWidth * i / 6);
                    
                    let timeStr;
                    if (this.selectedTimeframe === '7d') {
                        timeStr = dataPoint.time.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                        });
                    } else {
                        timeStr = dataPoint.time.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                        });
                    }
                    ctx.fillText(timeStr, x, height - margin + 20);
                }
            }
        }
        
        // Draw current price dot
        if (data.length > 0) {
            const lastPoint = data[data.length - 1];
            const x = margin + chartWidth;
            const y = height - margin - ((lastPoint.price - minPrice) / priceRange) * chartHeight;
            
            ctx.fillStyle = isPositive ? '#4CAF50' : '#f44336';
            ctx.beginPath();
            ctx.arc(x, y, showLabels ? 6 : 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add glow effect
            ctx.shadowColor = isPositive ? '#4CAF50' : '#f44336';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, showLabels ? 4 : 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    
    updateChartInfo() {
        const data = this.historicalData[this.selectedTimeframe];
        if (data.length === 0) return;
        
        const prices = data.map(item => item.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const titles = {
            '1h': 'Last 1 Hour',
            '6h': 'Last 6 Hours', 
            '12h': 'Last 12 Hours',
            '24h': 'Last 24 Hours',
            '7d': 'Last 7 Days'
        };
        
        this.element.querySelector('.timeframe-title').textContent = titles[this.selectedTimeframe];
        this.element.querySelector('#price-range').textContent = 
            `Range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`;
    }
    
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        const expandedElement = this.element.querySelector('#bitcoin-expanded');
        
        if (this.isExpanded) {
            expandedElement.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            
            // Load data for selected timeframe if not already loaded
            if (this.historicalData[this.selectedTimeframe].length === 0) {
                this.fetchHistoricalData(this.selectedTimeframe).then(() => {
                    this.drawExpandedChart();
                    this.updateChartInfo();
                });
            } else {
                this.updateDisplay();
                this.drawExpandedChart();
                this.updateChartInfo();
            }
        } else {
            expandedElement.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
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
        
        // Load data if not already loaded
        if (this.historicalData[timeframe].length === 0) {
            this.fetchHistoricalData(timeframe).then(() => {
                this.drawExpandedChart();
                this.updateChartInfo();
            });
        } else {
            this.drawExpandedChart();
            this.updateChartInfo();
        }
    }
    
    startUpdates() {
        // Update every 2 minutes to avoid API rate limits
        this.intervalId = setInterval(() => {
            this.fetchAllData();
        }, 120000);
    }
    
    updateData(data) {
        // Handle WebSocket updates if needed
    }
    
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        document.body.style.overflow = ''; // Restore scrolling if modal was open
    }
}
