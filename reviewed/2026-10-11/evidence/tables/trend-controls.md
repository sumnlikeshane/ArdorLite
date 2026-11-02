# Trend quality historical CAGR with comparable-risk controls

Units: annual percent. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | sharpe | maximum_drawdown | market_exposure | annualized_volatility | vol_matched_cagr_to_EMA20_50_UNFILTERED | additional_claim_ids |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S0_UNFILTERED | 2.215992539983791 | trend-controls-01 | 0.45903519964258765 | -14.909036740968673 | 20.889777679878065 | 5.0532226505023665 | 2.2083055837874843 | {'sharpe': 'trend-controls-01-sharpe', 'maximum_drawdown': 'trend-controls-01-maximum-drawdown', 'market_exposure': 'trend-controls-01-market-exposure', 'annualized_volatility': 'trend-controls-01-annualized-volatility', 'vol_matched_cagr_to_EMA20_50_UNFILTERED': 'trend-controls-01-vol-matched-cagr-to-EMA20-50-UNFILTERED'} |
| EMA20_50_UNFILTERED | 2.4668525391514207 | trend-controls-02 | 0.5092011000768754 | -10.36082684626136 | 20.77737130473255 | 5.03481342566379 | 2.4668525391514207 | {'sharpe': 'trend-controls-02-sharpe', 'maximum_drawdown': 'trend-controls-02-maximum-drawdown', 'market_exposure': 'trend-controls-02-market-exposure', 'annualized_volatility': 'trend-controls-02-annualized-volatility', 'vol_matched_cagr_to_EMA20_50_UNFILTERED': 'trend-controls-02-vol-matched-cagr-to-EMA20-50-UNFILTERED'} |
| V5_S0_Q67_DIVERSIFIED | 4.303282556817045 | trend-controls-03 | 0.81018721535534 | -9.549038502624397 | 20.717353881829403 | 5.3797773117983265 | 4.030967697349963 | {'sharpe': 'trend-controls-03-sharpe', 'maximum_drawdown': 'trend-controls-03-maximum-drawdown', 'market_exposure': 'trend-controls-03-market-exposure', 'annualized_volatility': 'trend-controls-03-annualized-volatility', 'vol_matched_cagr_to_EMA20_50_UNFILTERED': 'trend-controls-03-vol-matched-cagr-to-EMA20-50-UNFILTERED'} |
| NIFTYBEES_BH | 10.963632956477042 | trend-controls-04 | 0.7540248007869673 | -36.33626215606694 | 99.99896080810223 | 15.375954428585892 | 3.737343835304263 | {'sharpe': 'trend-controls-04-sharpe', 'maximum_drawdown': 'trend-controls-04-maximum-drawdown', 'market_exposure': 'trend-controls-04-market-exposure', 'annualized_volatility': 'trend-controls-04-annualized-volatility', 'vol_matched_cagr_to_EMA20_50_UNFILTERED': 'trend-controls-04-vol-matched-cagr-to-EMA20-50-UNFILTERED'} |

Extraction: Select S0, unfiltered EMA20/50, V5 and buy-and-hold. Multiply fractional rates/exposures by 100; retain Sharpe and recorded CAGR scaled to EMA risk as additional fields. No synthetic NAV.

Caveats:

- Post-hoc historical development; no live/shadow authorization.
- V0 already-observed reference and EMA quality-filter diagnostic are not selectable variants or binding controls.
- Only wf1–wf4 count as complete folds; wf5_partial is excluded from the fold gate.
- Full-capital NIFTYBEES CAGR has materially greater exposure and volatility; compare risks before interpreting returns.
- Daily NAV was not persisted; no equity, underwater or rolling-Sharpe curves can be reconstructed from summary metrics.
- Archived TSS diagnosis seal points to an engine whose bytes later changed; current-code parity is not promised.
