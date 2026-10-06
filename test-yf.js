const yahooFinance = require('yahoo-finance2');
yahooFinance.quote('AAPL').then(res => console.log("SUCCESS:", res.regularMarketPrice)).catch(err => console.error("ERROR:", err));
