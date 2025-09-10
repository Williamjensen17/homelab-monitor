export default class ClockApp {
    constructor(config, element, appManager) {
        this.config = config;
        this.element = element;
        this.appManager = appManager;
        this.intervalId = null;
    }
    
    init() {
        this.render();
        this.startClock();
    }
    
    render() {
        this.element.innerHTML = `
            <div class="clock-container">
                <div class="clock-time" id="clock-time"></div>
                ${this.config.showDate ? '<div class="clock-date" id="clock-date"></div>' : ''}
            </div>
            <style>
                .clock-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    font-family: 'Courier New', monospace;
                }
                .clock-time {
                    font-size: 2.5em;
                    font-weight: bold;
                    color: #4CAF50;
                    text-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
                }
                .clock-date {
                    font-size: 1.2em;
                    color: #ccc;
                    margin-top: 10px;
                }
            </style>
        `;
    }
    
    startClock() {
        this.updateClock();
        this.intervalId = setInterval(() => this.updateClock(), 1000);
    }
    
    updateClock() {
        const now = new Date();
        const timeElement = this.element.querySelector('#clock-time');
        const dateElement = this.element.querySelector('#clock-date');
        
        if (timeElement) {
            const timeString = this.config.format24h 
                ? now.toLocaleTimeString('en-GB', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: this.config.showSeconds ? '2-digit' : undefined
                })
                : now.toLocaleTimeString('en-US', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: this.config.showSeconds ? '2-digit' : undefined
                });
            
            timeElement.textContent = timeString;
        }
        
        if (dateElement && this.config.showDate) {
            const dateString = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateElement.textContent = dateString;
        }
    }
    
    updateData(data) {
        // Handle any real-time updates if needed
    }
    
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
