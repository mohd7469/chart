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
        indicators: [
          {
            name: 'Volume',
            inputs: []
          },
          {
            name: 'Relative Strength Index',
            inputs: [14]
          }
        ]
      })),
    ],
    disabledFeatures: [
      'use_localstorage_for_settings',
      "create_volume_indicator_by_default",
      "create_volume_indicator_by_default_once",
      "trading_account_manager",
      "volume_force_overlay",
      'open_account_manager',
      "right_toolbar",
      "order_panel",
      'dom_widget',
    ]
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
    timezone: "Asia/Karachi",
    enabled_features: [
      'pre_post_market_sessions',
      'subsession_id_properties',
    ],
    disabled_features: config.disabledFeatures,
    overrides: {
      // "mainSeriesProperties.style": 1,
      "mainSeriesProperties.showCountdown": true,
      // 'mainSeriesProperties.sessionId': 'extended',
    },
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
    // 1. Initial Layout set karein
    const layout = config.symbols.length + 'h'; // getLayoutValue(config.symbols.length)
    widget.setLayout(layout);

    // 2. Initial Charts Setup (Symbols, Indicators etc.)
    for (let i = 0; i < config.symbols.length; i++) {
      try {
        const chart = widget.chart(i);

        if (chart) {
          const { symbol, interval, chartType, indicators } = config.symbols[i];

          chart.setSymbol(symbol, () => {
            chart.setResolution(interval);
            chart.setChartType(chartDisplayTypes[chartType]);

            if (indicators) {
              // indicators.forEach(ind => {
              // 	const inputs = ind.inputs || [];
              // 	chart.createStudy(
              // 		ind.name,
              // 		false,    // forceOverlay
              // 		false,    // lock
              // 		inputs
              // 	);
              // });
              Promise.all(
                indicators.map(ind => {
                  const inputs = ind.inputs || [];
                  return chart.createStudy(
                    ind.name,
                    false,    // forceOverlay
                    false,    // lock
                    inputs
                  );
                })
              ).then(() => {
                const setPaneHeights = (attempts = 0, lastHeight = -1) => {
                  try {
                    const panes = chart.getPanes();
                    if (!panes || panes.length <= 1) return;

                    const totalHeight = panes.reduce((sum, p) => sum + p.getHeight(), 0);

                    // Retry if height is invalid or still changing (layout not settled)
                    if (totalHeight < 100 || totalHeight !== lastHeight) {
                      if (attempts < 15) setTimeout(() => setPaneHeights(attempts + 1, totalHeight), 400);
                      return;
                    }

                    let indHeight = 100;
                    let mainHeight = totalHeight - (panes.length - 1) * indHeight;

                    // Agar unlimited indicators lag jayein aur jagah kam parh jaye
                    if (mainHeight < 100) {
                      mainHeight = 100; // Main pane ko kam se kam 100px dena hai
                      indHeight = Math.floor((totalHeight - 100) / (panes.length - 1)); // Baaki jagah indicators me baant do
                    }

                    panes[0].setHeight(mainHeight);

                    // Wait for main pane to resize before sizing indicators
                    setTimeout(() => {
                      for (let p = 1; p < panes.length; p++) {
                        try { panes[p].setHeight(indHeight); } catch (e) { }
                      }
                    }, 600);
                  } catch (e) {
                    console.error("Error resizing panes:", e);
                  }
                };

                setTimeout(setPaneHeights, 800);
              }).catch(err => console.error("Error creating studies:", err));
            }
          });

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Error setting layout ${i}:`, err);
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", initOnReady, false);
