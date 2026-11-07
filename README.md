# GridSense AI — Intelligence for a Resilient Energy Grid

GridSense AI is an AI-powered electricity demand forecasting, SCADA data provenance auditing, scenario simulation, and grid risk intelligence platform built around authentic Grid-India 15-minute telemetry research.

---

## 1. Project Overview & Problem Statement

Modern electricity grids face growing operational uncertainty due to fluctuating solar and wind generation, weather-sensitive cooling and agricultural loads, and limited visibility into multi-hour demand ramps.

GridSense AI provides a four-hour lookahead decision-support layer that helps operators and researchers understand:
- What national electricity demand (`demand_met_mw`) will look like **four hours ahead** (16 fifteen-minute intervals).
- How the frozen **Residual HistGradientBoosting (`residual_hgb_flexible__source_hour_shrinkage`)** model compares against a 24-hour Seasonal Naive benchmark across chronological rolling-origin windows.
- Where data freshness (`2026-09-29 23:45` watermark) or seasonal regime shifts (such as the **2026 Q3 underforecast bias of -1,142.8 MW**) bound confidence.
- How hypothetical demand shocks, renewable generation shifts, and user-specified battery storage assumptions behave relative to recorded SCADA baselines.
- Which additional real-world measurements are required before a physical supply-demand deficit can be calculated (`total_gen_mw` is strictly treated as scheduled generation, never measured physical supply).

---

## 2. Architecture & Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons.
- **Backend**: Node.js / Express (`server.ts`) + TypeScript ML & SCADA Provenance Engine (`server/gridEngine.ts`).
- **Research Configurations & Reports**:
  - Frozen Prospective Config: `configs/experiments/demand_4h_prospective_v1.json`
  - Frozen Candidate Artifact: `configs/artifacts/residual_hgb_flexible__source_hour_shrinkage.artifact.json`
  - Legacy Mismatch Test Artifact: `configs/artifacts/residual_hgb_v0_unshrunk.artifact.json`
  - Rolling-Origin Evaluation Report: `configs/reports/rolling_origin_evaluation.json`
  - Provenance Manifest & Data Dictionary: `configs/provenance_manifest.json`

---

## 3. Machine Learning Pipeline & Rolling-Origin Evaluation

### Supervised Formulation
- **Target**: `demand_met_mw` at $t + 16$ intervals ($+4.0$ hours).
- **Causal Input Features (9 features)**:
  1. `demand_met_mw` (Observed demand at issue time $t$)
  2. `demand_lag_1h_mw` ($t - 4$ intervals)
  3. `demand_lag_4h_mw` ($t - 16$ intervals)
  4. `demand_lag_24h_mw` ($t - 96$ intervals)
  5. `demand_roll_mean_1h_mw` (Trailing 4-interval arithmetic mean)
  6. `hour_sin`, `hour_cos` (Time-of-day cyclical encoding)
  7. `dow_sin`, `dow_cos` (Day-of-week cyclical encoding)

### Pooled Rolling-Origin Results (`17,472` samples across `2025 Q3`, `2026 Q1`, `2026 Q3`)
| Model | Pooled MAE (MW) | Pooled RMSE (MW) | Pooled $R^2$ | Mean Bias (MW) |
| :--- | ---: | ---: | ---: | ---: |
| Persistence Baseline ($t \to t+4\text{h}$) | 14,820.6 | 18,490.2 | 0.341 | +42.1 |
| Seasonal Naive Baseline ($t-20\text{h} \to t+4\text{h}$) | 5,433.4 | 7,409.8 | 0.892 | -198.5 |
| Ridge Regression | 3,684.9 | 4,912.5 | 0.952 | -265.0 |
| Random Forest (Residual) | 3,392.1 | 4,518.7 | 0.959 | -412.6 |
| **Candidate Residual HGB (`residual_hgb_flexible__source_hour_shrinkage`)** | **3,150.4** | **4,228.4** | **0.965** | **-384.2** |

### Known Limitations (Explicitly Exposed)
- **2026 Q3 Underforecast Bias**: While the candidate HGB model beats Seasonal Naive by 39.1% MAE in 2026 Q3 (`3,784.1 MW` vs `6,211.8 MW`), it exhibits a `-1,142.8 MW` mean bias (`68.4%` underforecast rate) due to late-monsoon high-humidity cooling surges without exogenous weather forecast inputs.
- **Static Snapshot Watermark**: The local SCADA dataset ends at `2026-09-29 23:45`. Prospective validation beyond this timestamp is blocked until newer authentic telemetry is loaded.
- **Scheduled vs. Delivered Generation**: `total_gen_mw` represents scheduled generation only and is never used to compute physical grid surplus/deficit.

---

## 4. REST API Documentation

- `GET /api/health` — Returns service health, dataset watermark, and artifact compatibility status.
- `GET /api/overview` — Returns the 6 sourced KPIs, 15-minute SCADA demand timeline, system intelligence status, and chronological audit events.
- `GET /api/data/metadata` & `GET /api/data/quality` — Returns SHA-256 dataset provenance, missing-value/cadence counts, and the 164-column data dictionary summary.
- `GET /api/forecast/metadata` — Returns `configs/experiments/demand_4h_prospective_v1.json`, artifact compatibility status, and selectable issue timestamps.
- `GET /api/forecast/history?window=2026_Q3` — Returns historical actual vs. predicted vs. seasonal naive observations.
- `POST /api/forecast` — Validates `issue_timestamp` and artifact compatibility, returning the 4-hour prediction and 9-feature causal vector (or HTTP 409 `BLOCKED_ARTIFACT_MISMATCH` if an incompatible artifact is loaded).
- `POST /api/model/artifact-mode` — Switches between `residual_hgb_flexible__source_hour_shrinkage` and legacy `residual_hgb_v0_unshrunk` to verify the compatibility safeguard.
- `GET /api/model/performance`, `GET /api/model/rolling-origin`, `GET /api/model/bias` — Returns the saved evaluation reports.
- `POST /api/scenario/simulate` — Computes hypothetical demand, solar/wind, and battery peak-shaving simulations relative to recorded SCADA baselines.
- `GET /api/risk/status` & `GET /api/recommendations` — Returns the Limited Data Mode risk classifications and evidence-backed operational recommendations.

---

## 5. Local Startup & Verification Commands

```bash
# Install dependencies
npm install

# Start full-stack development server on http://localhost:3000
npm run dev

# Type-check and lint
npm run lint

# Build production bundle
npm run build
```

---

## 6. How to Load Newer Authentic Data & Run Prospective Evaluation

1. Place the new authentic Grid-India 15-minute SCADA CSV batch in `data/` and compute its SHA-256 hash.
2. Update `configs/provenance_manifest.json` only after verifying zero duplicate timestamps, 15-minute cadence continuity, and presence of `demand_met_mw`.
3. Verify that the active model artifact matches `configs/experiments/demand_4h_prospective_v1.json` (`residual_hgb_flexible__source_hour_shrinkage`) before unlocking prospective validation.
