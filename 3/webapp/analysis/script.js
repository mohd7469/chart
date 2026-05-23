function getSymbol() {
  const urlParams = new URLSearchParams(window.location.search);
  const symbol = urlParams.get('symbol');

  if (!symbol) return 'BINANCE:BTCUSDT.P';

  let normalized = symbol.toUpperCase().trim();
  if (!normalized.includes(':')) {
    normalized = 'BINANCE:' + normalized;
  }
  return normalized;
}

async function initOnReady() {
  const normalizeSymbol = getSymbol();

  window.TVConfig = {
    candleRange: 5,
    symbols: [
      ...['1', '3', '5', '15', '30', '60', '240', '1D'].map(tf => ({
        symbol: normalizeSymbol,
        chartType: 'candles',
        interval: tf,
        indicators: []
      })),
    ],
    disabledFeatures: ["order_panel", "trading_account_manager", "right_toolbar"]
  }

  const waitForTradingView = () => {
    return new Promise((resolve) => {
      const check = () =>
        window.TradingView?.TradingViewDatafeed
          ? resolve()
          : setTimeout(check, 100);

      check();
    });
  };

  await waitForTradingView();

  class CustomDatafeed extends TradingView.TradingViewDatafeed {
    constructor() {
      super();
    }
  }

  const config = window.TVConfig
  const datafeed = new CustomDatafeed();

  var widget = (window.tvWidget = new TradingView.widget({
    library_path: "../charting_library/",
    // debug: true, // uncomment this line to see Library errors and warnings in the console
    fullscreen: true,
    symbol: config.symbols[0].symbol,
    interval: config.symbols[0].interval,
    container: "tv_chart_container",
    datafeed: datafeed,
    locale: "en",
    enabled_features: [
      'pre_post_market_sessions',
      'subsession_id_properties',
    ],
    disabled_features: config.disabledFeatures,
  }));

  const chartDisplayTypes = {
    'bars': 0,
    'candles': 1,
    'line': 2,
    'area': 3,
    'renko': 4,
    'heikin_ashi': 8,
    'hollow_candles': 9,
    'baseline': 10,
    'hi_lo': 12,
    'column': 13,
    'volume_candles': 19,
  };

  widget.onChartReady(async () => {
    // Set layout to '8h' as requested by user
    widget.setLayout('8h');

    // Populate charts with config symbols
    const maxCharts = config.symbols.length;
    for (let i = 0; i < maxCharts; i++) {
      try {
        const chart = widget.chart(i);
        if (chart) {
          const { symbol, interval, chartType } = config.symbols[i];

          chart.setSymbol(symbol, () => {
            chart.setResolution(interval);
            chart.setChartType(chartDisplayTypes[chartType] || 1);
          });

          // Wait between chart setups to ensure layout manager processes them correctly (like in BTCUSDT.html)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.error("Error setting chart", i, e);
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", initOnReady, false);
