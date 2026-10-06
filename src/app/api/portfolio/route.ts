import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'data.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '1mo'; // default 1mo
  // Map our UI ranges to Yahoo ranges
  const rangeMap: Record<string, string> = {
    '1d': '1d',
    '5d': '5d',
    '1mo': '1mo',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y': '1y'
  };
  const yahooRange = rangeMap[range] || '1mo';
  const interval = ['1d', '5d'].includes(yahooRange) ? '5m' : '1d';

  if (!fs.existsSync(dataFilePath)) {
    return NextResponse.json({ portfolio: [], summary: { totalInvested: 0, currentValue: 0, totalGain: 0, totalGainPercent: 0 } });
  }

  const fileContents = fs.readFileSync(dataFilePath, 'utf8');
  const transactions = JSON.parse(fileContents);

  let cashDeposited = 0;
  let cashWithdrawn = 0;
  let realizedGain = 0; 
  let stocks: Record<string, { ticker: string, shares: number, totalCost: number, currency: string }> = {};

  for (const tx of transactions) {
    if (tx.type === 'DEPOSIT') cashDeposited += tx.amount || 0;
    if (tx.type === 'WITHDRAWAL') cashWithdrawn += tx.amount || 0;
    if (tx.type === 'BUY') {
      if (!stocks[tx.ticker]) stocks[tx.ticker] = { ticker: tx.ticker, shares: 0, totalCost: 0, currency: tx.currency || 'EUR' };
      stocks[tx.ticker].shares += tx.shares;
      stocks[tx.ticker].totalCost += (tx.shares * tx.price);
    }
    if (tx.type === 'SELL') {
      if (stocks[tx.ticker]) {
        const avgCost = stocks[tx.ticker].totalCost / stocks[tx.ticker].shares;
        const gainFromSale = (tx.price - avgCost) * tx.shares;
        realizedGain += gainFromSale;
        stocks[tx.ticker].shares -= tx.shares;
        stocks[tx.ticker].totalCost -= (tx.shares * avgCost);
        if (stocks[tx.ticker].shares <= 0.0001) {
          delete stocks[tx.ticker];
        }
      }
    }
  }

  let tickerRealizedGains: Record<string, number> = {};
  let tempStocks: Record<string, {shares: number, totalCost: number}> = {};
  for (const tx of transactions) {
    if (tx.type === 'BUY') {
      if (!tempStocks[tx.ticker]) tempStocks[tx.ticker] = {shares: 0, totalCost: 0};
      tempStocks[tx.ticker].shares += tx.shares;
      tempStocks[tx.ticker].totalCost += (tx.shares * tx.price);
    }
    if (tx.type === 'SELL') {
      if (tempStocks[tx.ticker]) {
        const avgCost = tempStocks[tx.ticker].totalCost / tempStocks[tx.ticker].shares;
        const gain = (tx.price - avgCost) * tx.shares;
        tickerRealizedGains[tx.ticker] = (tickerRealizedGains[tx.ticker] || 0) + gain;
        tempStocks[tx.ticker].shares -= tx.shares;
        tempStocks[tx.ticker].totalCost -= (tx.shares * avgCost);
      }
    }
  }

  const closedPositions = Object.keys(tickerRealizedGains)
    .filter(ticker => !stocks[ticker] || stocks[ticker].shares <= 0.0001)
    .map(ticker => ({ ticker, realizedGain: tickerRealizedGains[ticker] }));

  const activeStocks = Object.values(stocks);
  const tickers = activeStocks.map(s => s.ticker);

  // We need historical data for ALL tickers that were ever traded to build an accurate past chart
  const allTradedTickers = Array.from(new Set(transactions.filter((t: any) => t.ticker).map((t: any) => t.ticker)));

  let livePrices: Record<string, any> = {};
  let historicalDataByTicker: Record<string, { timestamps: number[], closes: number[] }> = {};
  
  if (allTradedTickers.length > 0) {
    try {
      await Promise.all(allTradedTickers.map(async (ticker) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker as string)}?interval=${interval}&range=${yahooRange}`, { cache: 'no-store' });
          const data = await res.json();
          if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            if (tickers.includes(ticker as string)) {
              livePrices[ticker as string] = {
                price: meta.regularMarketPrice,
                name: meta.symbol
              };
            }
            if (result.timestamp && result.indicators?.quote?.[0]?.close) {
              historicalDataByTicker[ticker as string] = {
                timestamps: result.timestamp,
                closes: result.indicators.quote[0].close
              };
            }
          }
        } catch (err) {
          console.error(`Error fetching ${ticker}`, err);
        }
      }));
    } catch (e) {
      console.error("Error in promise all", e);
    }
  }

  // Fetch exchange rate USD -> EUR
  let usdToEur = 1;
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDEUR=X?interval=1d&range=1d`, { cache: 'no-store' });
    const data = await res.json();
    if (data && data.chart && data.chart.result && data.chart.result[0]) {
      usdToEur = data.chart.result[0].meta.regularMarketPrice || 1;
    }
  } catch (err) {
    console.error("Error fetching exchange rate", err);
  }

  let currentValue = 0;
  let totalConvertedCost = 0; // to track the base cost in EUR

  const portfolio = activeStocks.map(s => {
    const live = livePrices[s.ticker];
    const entryPrice = s.totalCost / s.shares; // in original currency
    const currentPrice = live && live.price !== undefined && live.price !== null ? live.price : entryPrice; // in original currency
    const name = live ? live.name : s.ticker;
    
    let stockCurrentValue = s.shares * currentPrice; // in original currency
    let stockTotalCost = s.totalCost; // in original currency

    // Convert to EUR if USD
    if (s.currency === 'USD') {
      stockCurrentValue *= usdToEur;
      stockTotalCost *= usdToEur;
    }

    currentValue += stockCurrentValue;
    totalConvertedCost += stockTotalCost;

    return {
      id: s.ticker,
      ticker: s.ticker,
      name: name,
      shares: s.shares,
      entryPrice: entryPrice, // keep display in original currency
      currentPrice: currentPrice, // keep display in original currency
      currency: s.currency,
      totalValue: stockCurrentValue, // in EUR
      gain: stockCurrentValue - stockTotalCost, // in EUR
      gainPercent: ((stockCurrentValue - stockTotalCost) / stockTotalCost) * 100
    };
  });

  const totalInvested = cashDeposited - cashWithdrawn;
  const netInvested = totalInvested > 0 ? totalInvested : totalConvertedCost;
  const totalGain = currentValue - netInvested;
  const totalGainPercent = netInvested > 0 ? (totalGain / netInvested) * 100 : 0;

  // Build TRUE global historical chart data
  let globalChartMap: Record<number, number> = {};
  
  // Create a timeline of timestamps from the fetched data
  let allTimestamps = new Set<number>();
  Object.values(historicalDataByTicker).forEach(hist => {
    hist.timestamps.forEach(t => allTimestamps.add(t));
  });
  const sortedTimestamps = Array.from(allTimestamps).sort();

  for (const ts of sortedTimestamps) {
    const dateOfTs = new Date(ts * 1000);
    // Determine shares owned for each ticker at this precise time
    let valueAtTs = 0;
    let hasPositions = false;

    for (const ticker of allTradedTickers) {
      // Calculate shares owned AT OR BEFORE this timestamp
      let sharesAtTs = 0;
      for (const tx of transactions) {
        if (tx.ticker !== ticker) continue;
        const txDate = new Date(tx.date).getTime();
        // Compare dates. We assume transaction happens at 00:00 of that date, so if ts * 1000 >= txDate, it counts
        if (ts * 1000 >= txDate) {
          if (tx.type === 'BUY') sharesAtTs += tx.shares;
          if (tx.type === 'SELL') sharesAtTs -= tx.shares;
        }
      }

      if (sharesAtTs > 0.0001) {
        hasPositions = true;
        // Find the price at this timestamp for this ticker
        const hist = historicalDataByTicker[ticker as string];
        let price = 0;
        if (hist) {
          // Find closest timestamp before or equal to ts
          let closestIdx = -1;
          for (let i = 0; i < hist.timestamps.length; i++) {
            if (hist.timestamps[i] <= ts) closestIdx = i;
            else break;
          }
          if (closestIdx >= 0) {
            price = hist.closes[closestIdx];
            // If the close is null (sometimes happens in Yahoo), fallback to previous valid close
            let backIdx = closestIdx;
            while (!price && backIdx >= 0) {
              price = hist.closes[backIdx];
              backIdx--;
            }
          }
        }
        
        // Find the currency of the ticker from the first transaction
        const txForTicker = transactions.find((t: any) => t.ticker === ticker);
        const currency = txForTicker ? txForTicker.currency : 'EUR';
        
        let stockValueAtTs = sharesAtTs * (price || 0);
        if (currency === 'USD') {
          stockValueAtTs *= usdToEur;
        }
        
        valueAtTs += stockValueAtTs;
      }
    }

    if (hasPositions && valueAtTs > 0) {
      // Group by day for longer ranges to avoid too many points, except for 1d/5d
      if (['1d', '5d'].includes(yahooRange)) {
        globalChartMap[ts * 1000] = valueAtTs;
      } else {
        const dayTime = new Date(dateOfTs.toISOString().split('T')[0]).getTime();
        globalChartMap[dayTime] = valueAtTs; // overrides with latest value of the day
      }
    }
  }

  const chartData = Object.keys(globalChartMap)
    .sort()
    .map(time => {
      const dateObj = new Date(parseInt(time));
      let label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      if (['1d', '5d'].includes(yahooRange)) {
        label = `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      }
      return {
        date: label,
        value: globalChartMap[parseInt(time)]
      };
    });

  return NextResponse.json({
    portfolio,
    closedPositions,
    chartData,
    summary: {
      totalInvested: netInvested,
      currentValue,
      totalGain,
      totalGainPercent
    }
  });
}
