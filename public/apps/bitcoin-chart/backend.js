// public/apps/bitcoin-chart/backend.js
const axios = require("axios");

module.exports = function (app) {
  let cache = { currentPrice: 0, change24h: 0, history: {}, lastFetched: 0 };

  async function fetchBTC() {
    try {
      const resPrice = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        { params: { ids: "bitcoin", vs_currencies: "usd", include_24hr_change: true } }
      );
      cache.currentPrice = resPrice.data.bitcoin.usd;
      cache.change24h = resPrice.data.bitcoin.usd_24h_change;

      const resHist = await axios.get(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart",
        { params: { vs_currency: "usd", days: 7 } }
      );

      const prices = resHist.data.prices.map(([t, p]) => ({ time: t, price: p }));
      cache.history["7d"] = prices;
      cache.history["24h"] = prices.slice(-24);
      cache.history["12h"] = prices.slice(-12);
      cache.history["6h"] = prices.slice(-6);
      cache.history["1h"] = prices.slice(-1);
      cache.lastFetched = Date.now();
    } catch (err) {
      console.error("BTC fetch failed", err.message);
    }
  }

  // preload & refresh
  fetchBTC();
  setInterval(fetchBTC, 120000);

  // App’s own REST route
  app.get("/apps/bitcoin/data", (req, res) => {
    res.json(cache);
  });
};
