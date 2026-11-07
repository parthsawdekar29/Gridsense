import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardTabId,
  ForecastInferenceResponse,
  ForecastMetadataResponse,
  OverviewResponse,
  RecommendationsResponse,
  ScadaObservation,
} from '../../types/gridsense';
import { SmartGrid3DScene } from '../three/SmartGrid3DScene';

// Helper to shift 'YYYY-MM-DD HH:mm' by deltaMinutes
function shiftTimestampStr(ts: string | undefined, deltaMinutes: number): string {
  if (!ts) return 'N/A';
  const iso = ts.replace(' ', 'T') + ':00Z';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return ts;
  const target = new Date(ms + deltaMinutes * 60 * 1000);
  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  const hh = String(target.getUTCHours()).padStart(2, '0');
  const min = String(target.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

interface OverviewViewProps {
  overview: OverviewResponse | null;
  recommendations: RecommendationsResponse | null;
  onNavigateTab: (tab: DashboardTabId) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  overview,
  recommendations,
  onNavigateTab,
}) => {
  const [sliceSize, setSliceSize] = useState<number>(48);
  const [showScheduledProxy, setShowScheduledProxy] = useState<boolean>(false);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const [show3DTwin, setShow3DTwin] = useState<boolean>(true);

  if (!overview) {
    return (
      <div className="p-8 bg-[#172235] border border-white/12 text-sm font-mono text-[#A8B5C5]">
        Loading verified SCADA snapshot and rolling-origin evaluation summary...
      </div>
    );
  }

  const displayedTimeline = overview.timeline.slice(-sliceSize);
  const isCompatible = overview.system_intelligence.artifact_compatibility.compatible;

  const SYSTEM_PIPELINE = [
    {
      step: '01',
      name: 'DATA INGESTION',
      status: 'VERIFIED SNAPSHOT',
      tone: 'text-[#C6FF2E]',
      summary: '64,860 SCADA observations (15m cadence) loaded from local archive.',
      targetTab: 'data-health' as DashboardTabId,
    },
    {
      step: '02',
      name: 'VALIDATION',
      status: 'WATERMARK LOCKED',
      tone: 'text-[#3FD8FF]',
      summary: 'SHA-256 verified through 2026-09-29 23:45 IST; 0 duplicate timestamps.',
      targetTab: 'data-health' as DashboardTabId,
    },
    {
      step: '03',
      name: 'FORECAST ENGINE',
      status: isCompatible ? 'CANDIDATE ALIGNED' : 'ARTIFACT MISMATCH',
      tone: isCompatible ? 'text-[#C6FF2E]' : 'text-red-400',
      summary: 'Residual HGB (+4h / 16 intervals) with source-hour shrinkage.',
      targetTab: 'forecast' as DashboardTabId,
    },
    {
      step: '04',
      name: 'PERFORMANCE EVALUATION',
      status: '3,150.4 MW MAE',
      tone: 'text-[#C6FF2E]',
      summary: '42.0% error reduction vs Seasonal Naive across 3 chronological windows.',
      targetTab: 'performance' as DashboardTabId,
    },
    {
      step: '05',
      name: 'DECISION SUPPORT',
      status: 'LIMITED DATA MODE',
      tone: 'text-amber-400',
      summary: 'Scenario lab active; physical supply deficit blocked pending live telemetry.',
      targetTab: 'grid-risk' as DashboardTabId,
    },
  ];

  const EXPLAINED_METRICS = [
    {
      id: 'recorded-demand',
      contextGroup: 'SNAPSHOT OBSERVATION',
      title: 'RECORDED NATIONAL DEMAND',
      value: overview.kpis.latest_recorded_demand_mw.toLocaleString(),
      unit: 'MW',
      accent: 'text-[#F4F6FA]',
      explanation:
        'The most recent electricity demand measurement available in the loaded SCADA snapshot.',
      source: `Source: demand_met_mw at ${overview.kpis.latest_timestamp} IST`,
      technicalTooltip:
        'Represents national electricity demand met (in Megawatts) at the final 15-minute timestamp of the local Grid-India SCADA snapshot. This is a historical snapshot watermark, not a live real-time stream.',
    },
    {
      id: 'forecast-horizon',
      contextGroup: 'MODEL SPECIFICATION',
      title: 'FORECAST HORIZON',
      value: `${overview.kpis.forecast_horizon_hours}`,
      unit: 'Hours (16 × 15m intervals)',
      accent: 'text-[#3FD8FF]',
      explanation:
        'The model estimates demand sixteen 15-minute intervals after the selected issue time.',
      source: 'Source: configs/experiments/demand_4h_prospective_v1.json',
      technicalTooltip:
        'Supervised target y(t + 16) corresponds to demand_met_mw exactly 240 minutes after forecast issue timestamp t. Horizon is locked by the frozen prospective configuration.',
    },
    {
      id: 'dataset-count',
      contextGroup: 'SNAPSHOT OBSERVATION',
      title: 'DATASET OBSERVATION COUNT',
      value: overview.kpis.dataset_observation_count.toLocaleString(),
      unit: `Rows · ${overview.kpis.dataset_column_count} Columns`,
      accent: 'text-[#F4F6FA]',
      explanation:
        'Total 15-minute national grid records spanning November 2024 through September 2026.',
      source: 'Source: Grid-Sentinel / Grid-India SCADA Snapshot',
      technicalTooltip:
        'Of the 64,860 source rows, 61,940 contain complete 24-hour backward causal lag coverage required for feature generation without synthetic imputation.',
    },
    {
      id: 'source-watermark',
      contextGroup: 'DATA FRESHNESS GATE',
      title: 'LATEST SOURCE WATERMARK',
      value: overview.kpis.latest_timestamp.slice(0, 10),
      unit: `${overview.kpis.latest_timestamp.slice(11)} IST`,
      accent: 'text-amber-400',
      explanation:
        'Final timestamp in the local dataset; prospective validation beyond this date is blocked until newer data is loaded.',
      source: 'Status: PROSPECTIVE VALIDATION BLOCKED',
      technicalTooltip:
        'Engineering rule: GridSense AI never fabricates post-September 2026 observations. Prospective evaluation unlocks only when a newer authentic SCADA CSV batch is ingested.',
    },
    {
      id: 'historical-mae',
      contextGroup: 'HISTORICAL ROLLING-ORIGIN EVALUATION',
      title: 'HISTORICAL MODEL MAE',
      value: overview.kpis.candidate_pooled_mae_mw.toLocaleString(),
      unit: `MW (-${overview.kpis.mae_improvement_pct}% vs Baseline)`,
      accent: 'text-[#C6FF2E]',
      explanation:
        "On the pooled historical rolling-origin evaluation, the candidate model's average absolute forecast error was 3,150.4 MW.",
      source: `Evaluated across 2025 Q3, 2026 Q1, 2026 Q3 (R² ${overview.kpis.candidate_pooled_r2})`,
      technicalTooltip:
        'Mean Absolute Error (MAE) across 17,472 pooled test intervals. Compares candidate residual_hgb_flexible__source_hour_shrinkage (3,150.4 MW) against the 24-hour Seasonal Naive baseline (5,433.4 MW).',
    },
    {
      id: 'model-status',
      contextGroup: 'CONFIGURATION SAFEGUARD',
      title: 'MODEL EVALUATION STATUS',
      value: isCompatible ? 'Aligned' : 'Blocked',
      unit: isCompatible ? 'Frozen v1 Verified' : 'Artifact Mismatch',
      accent: isCompatible ? 'text-[#C6FF2E]' : 'text-red-400',
      explanation: isCompatible
        ? 'The loaded model artifact matches the frozen prospective experiment configuration.'
        : 'The loaded model artifact diverges from the frozen configuration; live inference is halted.',
      source: `Candidate: ${overview.system_intelligence.artifact_compatibility.active_artifact_id}`,
      technicalTooltip:
        'Verifies that feature names, target horizon (16 intervals), and source-hour empirical shrinkage match configs/experiments/demand_4h_prospective_v1.json before generating any forecast.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* HORIZONTAL 5-STAGE NORVA × MOSSLINE SYSTEM PIPELINE + 3D DIGITAL TWIN */}
      <div className="bg-[#172235] border border-white/15 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="gs-chip">5-Stage Intelligence Pipeline</span>
              <span className="gs-chip-cyan">Click Any Stage to Inspect</span>
            </div>
            <h2 className="font-display text-xl lg:text-2xl font-semibold text-[#F4F6FA] pt-1">
              Authentic Data → Validation → Forecast Engine → Evaluation → Decision Support
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShow3DTwin((v) => !v)}
              className="nv-pill nv-pill-lime"
            >
              <span>{show3DTwin ? 'Hide 3D Grid Twin' : 'Inspect 3D Grid Twin'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/12">
          {SYSTEM_PIPELINE.map((item, idx) => (
            <button
              key={item.step}
              onClick={() => onNavigateTab(item.targetTab)}
              className="text-left hover:bg-white/5 p-5 transition-colors flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded bg-[#f4f6fa] text-[#0f1626] font-mono text-xs font-bold inline-flex items-center justify-center">
                    {item.step}
                  </span>
                  {idx < SYSTEM_PIPELINE.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-[#3FD8FF] group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
                <div className="font-display text-sm font-semibold text-[#F4F6FA]">
                  {item.name}
                </div>
                <div className={`font-mono text-[11px] font-semibold mt-1 ${item.tone}`}>
                  {item.status}
                </div>
                <p className="text-xs text-[#A8B5C5] mt-2 leading-relaxed">{item.summary}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Interactive 3D WebGL Smart Grid Twin inside Overview */}
        {show3DTwin && (
          <div className="border-t border-white/15">
            <SmartGrid3DScene
              heightClass="h-[460px]"
              compactHud
              onSelectModule={(tab) => onNavigateTab(tab)}
            />
          </div>
        )}
      </div>

      {/* 6 EXPLAINED METRICS — MOSSLINE FROSTED GLASS TELEMETRY CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="gs-chip">Verified Telemetry &amp; Benchmarks</span>
            <span className="text-xs font-mono text-[#A8B5C5]">
              Separated by Snapshot Observation vs. Historical Evaluation Context
            </span>
          </div>
          <div className="text-xs font-mono text-[#3FD8FF]">
            Click &quot;Technical Meaning&quot; on any station card for mathematical details
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPLAINED_METRICS.map((m, idx) => {
            const isOpen = openTooltipId === m.id;
            return (
              <div
                key={m.id}
                className="bg-[#172235] border border-white/15 rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-white/10 text-[#c6ff2e] inline-flex items-center justify-center text-[10px]">
                        0{idx + 1}
                      </span>
                      <span className="text-[#3FD8FF]">{m.contextGroup}</span>
                    </span>
                    <button
                      onClick={() => setOpenTooltipId(isOpen ? null : m.id)}
                      className="text-[#A8B5C5] hover:text-[#F4F6FA] flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#c6ff2e]" />
                      <span>Technical Meaning</span>
                    </button>
                  </div>

                  <h3 className="font-mono text-xs font-semibold tracking-wider text-[#A8B5C5]">
                    {m.title}
                  </h3>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span
                      className={`font-display text-4xl font-semibold tracking-tight tabular-nums ${m.accent}`}
                    >
                      {m.value}
                    </span>
                    <span className="font-mono text-xs text-[#A8B5C5]">{m.unit}</span>
                  </div>

                  <p className="text-xs text-[#F4F6FA]/85 leading-relaxed pt-1">{m.explanation}</p>

                  {isOpen && (
                    <div className="mt-2 p-3.5 rounded-lg bg-[#0D1524] border border-[#3FD8FF]/40 text-xs text-[#A8B5C5] leading-relaxed">
                      <div className="font-mono text-[11px] text-[#3FD8FF] mb-1">
                        TECHNICAL DEFINITION
                      </div>
                      {m.technicalTooltip}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/12 text-[11px] font-mono text-[#718096]">
                  {m.source}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN VISUALIZATION — LARGE DOMINANT INTERACTIVE DEMAND CHART WITH ZOOM & READING GUIDE */}
      <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/12 pb-5">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#3FD8FF]">
              PRIMARY TELEMETRY & BACKTEST TIMELINE · 2026 Q3 WATERMARK WINDOW
            </div>
            <h2 className="font-display text-2xl font-bold text-[#F4F6FA]">
              Recorded National Demand vs. 4-Hour Model Predictions & Seasonal Baseline (MW)
            </h2>
            <p className="text-sm text-[#A8B5C5]">
              Compare actual recorded consumption (<code className="text-[#3FD8FF]">demand_met_mw</code>)
              against our candidate model&apos;s 4-hour historical predictions and the 24-hour
              seasonal naive benchmark.
            </p>
          </div>

          {/* Range Selector & Optional Scheduled Generation Proxy Toggle */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-[#0D1524] p-1 rounded border border-white/12">
              {[
                { label: '6h (24 pts)', val: 24 },
                { label: '12h (48 pts)', val: 48 },
                { label: '24h (96 pts)', val: 96 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setSliceSize(opt.val)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                    sliceSize === opt.val
                      ? 'bg-[#202D40] text-[#3FD8FF] font-semibold'
                      : 'text-[#A8B5C5] hover:text-[#F4F6FA]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowScheduledProxy((prev) => !prev)}
              className={`px-3.5 py-2 text-xs font-mono rounded border transition-colors cursor-pointer ${
                showScheduledProxy
                  ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold'
                  : 'bg-[#0D1524] border-white/12 text-[#A8B5C5] hover:text-[#F4F6FA]'
              }`}
            >
              {showScheduledProxy
                ? 'Hide Scheduled Generation Proxy (total_gen_mw)'
                : 'Overlay Scheduled Generation Proxy (total_gen_mw)'}
            </button>
          </div>
        </div>

        {/* Unmistakable Explanation Banner when Scheduled Generation Proxy is enabled */}
        {showScheduledProxy && (
          <div className="p-4 bg-amber-950/35 border border-amber-400/40 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-100">
              <strong className="font-mono text-amber-400 block mb-0.5">
                CRITICAL DISTINCTION: SCHEDULED GENERATION (total_gen_mw) IS NOT MEASURED DELIVERED SUPPLY
              </strong>
              The dashed amber curve (<code className="text-amber-300">total_gen_mw</code>) shows
              scheduled generation dispatch recorded in the SCADA snapshot. It does not account for
              forced generator outages, real-time frequency response, cross-border imports/exports,
              or transmission losses, and must never be subtracted from{' '}
              <code className="text-[#3FD8FF]">demand_met_mw</code> to claim a physical grid deficit.
            </div>
          </div>
        )}

        {/* Dominant Chart Canvas with Brush Zoom */}
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayedTimeline} margin={{ top: 12, right: 24, left: 18, bottom: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(v: string) => v.slice(5)}
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k MW`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1524',
                  borderColor: 'rgba(63, 216, 255, 0.35)',
                  borderRadius: '6px',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: '12px',
                  color: '#F4F6FA',
                }}
                formatter={(value, name) => [
                  `${Number(value ?? 0).toLocaleString()} MW`,
                  String(name ?? ''),
                ]}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '12px', paddingTop: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="demand_met_mw"
                name="Recorded National Demand (demand_met_mw)"
                stroke="#3FD8FF"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="historical_backtest_pred_mw"
                name="Candidate HGB 4-Hour Prediction (MW)"
                stroke="#C6FF2E"
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="seasonal_naive_pred_mw"
                name="24h Seasonal Naive Baseline (MW)"
                stroke="#A8B5C5"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
              {showScheduledProxy && (
                <Line
                  type="monotone"
                  dataKey="total_gen_mw"
                  name="Scheduled Generation Proxy (total_gen_mw — NOT Delivered Supply)"
                  stroke="#F59E0B"
                  strokeWidth={1.8}
                  strokeDasharray="2 4"
                  dot={false}
                />
              )}
              <Brush
                dataKey="timestamp"
                height={26}
                stroke="#3FD8FF"
                fill="#0D1524"
                tickFormatter={(v: string) => v.slice(11)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plain-English Guide Below Chart: "What You Are Looking At" */}
        <div className="bg-[#0D1524] border border-white/10 rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#3FD8FF] font-semibold">
              1. SOLID CYAN LINE — RECORDED DEMAND
            </div>
            <p className="text-xs text-[#A8B5C5] leading-relaxed">
              Shows authentic 15-minute national electricity consumption (<code className="text-[#F4F6FA]">demand_met_mw</code>)
              measured up to the dataset watermark (<code className="text-[#F4F6FA]">2026-09-29 23:45 IST</code>).
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#C6FF2E] font-semibold">
              2. SOLID LIME LINE — 4-HOUR ML FORECAST
            </div>
            <p className="text-xs text-[#A8B5C5] leading-relaxed">
              Shows what the frozen Residual HGB model predicted four hours earlier for each
              timestamp. Notice how closely it tracks morning and evening load ramps.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#A8B5C5] font-semibold">
              3. DASHED GREY LINE — SEASONAL NAIVE BASELINE
            </div>
            <p className="text-xs text-[#A8B5C5] leading-relaxed">
              Shows yesterday&apos;s demand at the same hour. When multi-day heat or humidity shifts
              overall load upward, the seasonal baseline lags behind while the ML model adapts.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Split: System Intelligence Limitations & Top Evidence-Backed Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#172235] border border-white/12 rounded-lg p-6 space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#F4F6FA]">
              Transparent System Boundaries & Known Limitations
            </h3>
            <span className="text-xs font-mono text-amber-400">NON-HIDDEN</span>
          </div>
          <ul className="space-y-3 text-xs text-[#A8B5C5] leading-relaxed">
            {overview.system_intelligence.known_limitations.map((lim, i) => (
              <li
                key={i}
                className="p-3.5 rounded bg-[#0D1524]/80 border border-white/10 flex items-start gap-3"
              >
                <span className="font-mono text-amber-400 font-semibold">0{i + 1}</span>
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 bg-[#172235] border border-white/12 rounded-lg p-6 space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#F4F6FA]">
              Evidence-Backed Operational Insights
            </h3>
            <button
              onClick={() => onNavigateTab('grid-risk')}
              className="text-xs font-mono text-[#3FD8FF] hover:underline cursor-pointer"
            >
              Inspect All Recommendations →
            </button>
          </div>
          <div className="space-y-3">
            {recommendations?.recommendations.slice(0, 2).map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded bg-[#0D1524]/80 border border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#C6FF2E]">EVIDENCE-BACKED INSIGHT</span>
                  <span className="text-[#3FD8FF]">{rec.severity.toUpperCase()}</span>
                </div>
                <div className="font-display text-sm font-bold text-[#F4F6FA]">{rec.title}</div>
                <p className="text-xs text-[#A8B5C5] leading-relaxed">{rec.suggested_action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 7: DEMAND FORECAST PAGE — EXPLAIN THE MODEL & VISUAL INPUT VECTOR
// ============================================================================

interface DemandForecastViewProps {
  metadata: ForecastMetadataResponse | null;
  onRefreshMetadata: () => Promise<void>;
}

export const DemandForecastView: React.FC<DemandForecastViewProps> = ({
  metadata,
  onRefreshMetadata,
}) => {
  const [selectedWindow, setSelectedWindow] = useState<'2025_Q3' | '2026_Q1' | '2026_Q3'>('2026_Q3');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('2026-09-29 19:45');
  const [historySeries, setHistorySeries] = useState<ScadaObservation[]>([]);
  const [inferenceResult, setInferenceResult] = useState<ForecastInferenceResponse | null>(null);
  const [loadingInference, setLoadingInference] = useState<boolean>(false);
  const [switchingArtifact, setSwitchingArtifact] = useState<boolean>(false);

  const windowTimestamps =
    metadata?.available_timestamps.filter((t) => t.window_id === selectedWindow) || [];

  useEffect(() => {
    let active = true;
    fetch(`/api/forecast/history?window=${selectedWindow}&limit=96`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setHistorySeries(data.series || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedWindow]);

  useEffect(() => {
    if (windowTimestamps.length > 0) {
      const exists = windowTimestamps.some((t) => t.timestamp === selectedTimestamp);
      if (!exists) {
        const defaultTs =
          windowTimestamps[Math.max(0, windowTimestamps.length - 20)]?.timestamp ||
          windowTimestamps[0].timestamp;
        setSelectedTimestamp(defaultTs);
      }
    }
  }, [selectedWindow, metadata]);

  const executeForecast = async (ts: string) => {
    setLoadingInference(true);
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_timestamp: ts }),
      });
      const data: ForecastInferenceResponse = await res.json();
      setInferenceResult(data);
    } catch (err) {
      console.error('Inference error', err);
    } finally {
      setLoadingInference(false);
    }
  };

  useEffect(() => {
    if (selectedTimestamp) {
      executeForecast(selectedTimestamp);
    }
  }, [selectedTimestamp, metadata?.compatibility.active_artifact_id]);

  const handleArtifactModeSwitch = async (
    artifactId: 'residual_hgb_flexible__source_hour_shrinkage' | 'residual_hgb_v0_unshrunk'
  ) => {
    setSwitchingArtifact(true);
    try {
      await fetch('/api/model/artifact-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_id: artifactId }),
      });
      await onRefreshMetadata();
      await executeForecast(selectedTimestamp);
    } finally {
      setSwitchingArtifact(false);
    }
  };

  if (!metadata) {
    return (
      <div className="p-8 bg-[#172235] border border-white/12 rounded-lg text-sm font-mono text-[#A8B5C5]">
        Loading frozen prospective configuration and model artifact verifier...
      </div>
    );
  }

  const isCompatible = metadata.compatibility.compatible;
  const activeArtifactObj =
    metadata.available_artifacts.find(
      (a) => a.artifact_id === metadata.compatibility.active_artifact_id
    ) || metadata.available_artifacts[0];
  const exactFeatureCount = metadata.frozen_config.required_features.length;

  // Build exact per-feature visual cards from the actual frozen configuration & selected observation
  const selectedObs = historySeries.find((o) => o.timestamp === selectedTimestamp);
  const issueTimeStr = inferenceResult?.issue_timestamp || selectedTimestamp;

  const detailedFeatures = metadata.frozen_config.required_features.map((reqFeat) => {
    let observedValStr = 'N/A';
    let timestampRef = `${issueTimeStr} IST (Issue Time t)`;
    let whyItMatters = '';

    switch (reqFeat.name) {
      case 'demand_met_mw':
        observedValStr = selectedObs
          ? `${selectedObs.demand_met_mw.toLocaleString()} MW`
          : 'Loaded at t';
        timestampRef = `${issueTimeStr} IST (Issue Time t)`;
        whyItMatters =
          'Anchors the current national load level right when the forecast is issued.';
        break;
      case 'demand_lag_1h_mw':
        observedValStr = selectedObs
          ? `${selectedObs.demand_lag_1h_mw.toLocaleString()} MW`
          : 'Loaded at t-1h';
        timestampRef = `${shiftTimestampStr(issueTimeStr, -60)} IST (t - 1 hour / 4 intervals)`;
        whyItMatters =
          'Measures short-term ramp velocity (how fast demand rose or fell over the last hour).';
        break;
      case 'demand_lag_4h_mw':
        observedValStr = selectedObs
          ? `${selectedObs.demand_lag_4h_mw.toLocaleString()} MW`
          : 'Loaded at t-4h';
        timestampRef = `${shiftTimestampStr(issueTimeStr, -240)} IST (t - 4 hours / 16 intervals)`;
        whyItMatters =
          'Captures medium-term intraday transitions (such as shifting from morning ramp to midday solar dip).';
        break;
      case 'demand_lag_24h_mw':
        observedValStr = selectedObs
          ? `${selectedObs.demand_lag_24h_mw.toLocaleString()} MW`
          : 'Loaded at t-24h';
        timestampRef = `${shiftTimestampStr(issueTimeStr, -1440)} IST (t - 24 hours / 96 intervals)`;
        whyItMatters =
          'Provides yesterday’s demand at the exact same issue hour to detect multi-day weather or industrial regime shifts.';
        break;
      case 'demand_roll_mean_1h_mw':
        observedValStr = selectedObs
          ? `${selectedObs.demand_roll_mean_1h_mw.toLocaleString()} MW`
          : '4-obs mean';
        timestampRef = `${shiftTimestampStr(issueTimeStr, -45)} → ${issueTimeStr} IST (4 intervals)`;
        whyItMatters =
          'Smooths out 15-minute SCADA telemetry jitter so the model reacts to sustained load trends rather than transient spikes.';
        break;
      case 'hour_sin':
        observedValStr = selectedObs ? selectedObs.hour_sin.toFixed(4) : 'sin(2π·h/24)';
        timestampRef = `Clock encoding at ${issueTimeStr} IST`;
        whyItMatters =
          'Works with hour_cos to represent the 24-hour daily cycle smoothly (so 23:45 and 00:00 are recognized as adjacent).';
        break;
      case 'hour_cos':
        observedValStr = selectedObs ? selectedObs.hour_cos.toFixed(4) : 'cos(2π·h/24)';
        timestampRef = `Clock encoding at ${issueTimeStr} IST`;
        whyItMatters =
          'Pairs with hour_sin to pinpoint the exact diurnal phase (night off-peak, morning ramp, solar midday, or evening peak).';
        break;
      case 'dow_sin':
        observedValStr = selectedObs ? selectedObs.dow_sin.toFixed(4) : 'sin(2π·d/7)';
        timestampRef = `Calendar day at ${issueTimeStr.slice(0, 10)}`;
        whyItMatters =
          'Captures weekly industrial and commercial load periodicity across weekdays and weekends.';
        break;
      case 'dow_cos':
        observedValStr = selectedObs ? selectedObs.dow_cos.toFixed(4) : 'cos(2π·d/7)';
        timestampRef = `Calendar day at ${issueTimeStr.slice(0, 10)}`;
        whyItMatters =
          'Completes the cyclical 7-day calendar representation without artificial Sunday-to-Monday jumps.';
        break;
      default:
        whyItMatters = reqFeat.description;
    }

    return {
      ...reqFeat,
      observedValStr,
      timestampRef,
      whyItMatters,
    };
  });

  return (
    <div className="space-y-10">
      {/* TOP HEADER: FOUR-HOUR DEMAND FORECAST EXPLANATION & CONTROLS */}
      <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-white/12 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="text-xs font-mono text-[#3FD8FF] tracking-wider">
              PRIMARY TECHNICAL DEMONSTRATION · FROZEN CONFIG: {metadata.frozen_config.config_id}
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F4F6FA]">
              FOUR-HOUR DEMAND FORECAST
            </h2>
            <p className="text-sm lg:text-base text-[#A8B5C5] leading-relaxed">
              The model uses historical demand patterns and time-based features to estimate
              electricity demand four hours ahead (16 fifteen-minute intervals). Rather than
              predicting isolated load numbers, it predicts the residual change over the 24-hour
              seasonal baseline and applies source-hour shrinkage.
            </p>
          </div>

          {/* Interactive Artifact Compatibility Safeguard Switcher */}
          <div className="bg-[#0D1524] border border-white/12 rounded-lg p-4 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-4 text-[11px] font-mono">
              <span className="text-[#A8B5C5]">ARTIFACT SAFEGUARD TESTER</span>
              <span className={isCompatible ? 'text-[#C6FF2E]' : 'text-red-400'}>
                {isCompatible ? 'HTTP 200 OK' : 'HTTP 409 BLOCKED'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={switchingArtifact}
                onClick={() =>
                  handleArtifactModeSwitch('residual_hgb_flexible__source_hour_shrinkage')
                }
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                  isCompatible
                    ? 'bg-[#C6FF2E] text-[#0D1524] font-semibold'
                    : 'bg-[#172235] text-[#A8B5C5] hover:text-[#F4F6FA]'
                }`}
              >
                Verified Frozen Artifact ({exactFeatureCount} Features)
              </button>
              <button
                disabled={switchingArtifact}
                onClick={() => handleArtifactModeSwitch('residual_hgb_v0_unshrunk')}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                  !isCompatible
                    ? 'bg-red-500 text-white font-semibold'
                    : 'bg-[#172235] text-[#A8B5C5] hover:text-[#F4F6FA]'
                }`}
              >
                Simulate Incompatible Artifact
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Timestamp & Evaluation Window Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-mono text-[#A8B5C5] mb-2">
              1. SELECT EVALUATION PERIOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['2025_Q3', '2026_Q1', '2026_Q3'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWindow(w)}
                  className={`py-2 px-3 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    selectedWindow === w
                      ? 'bg-[#202D40] border-[#3FD8FF] text-[#F4F6FA] font-semibold'
                      : 'bg-[#0D1524] border-white/12 text-[#A8B5C5] hover:text-[#F4F6FA]'
                  }`}
                >
                  {w.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="forecast-issue-select"
              className="block text-xs font-mono text-[#A8B5C5] mb-2"
            >
              2. SELECT FORECAST ISSUE TIMESTAMP (t)
            </label>
            <select
              id="forecast-issue-select"
              value={selectedTimestamp}
              onChange={(e) => setSelectedTimestamp(e.target.value)}
              className="w-full bg-[#0D1524] border border-white/15 rounded px-3 py-2 text-xs font-mono text-[#F4F6FA] focus:outline-none focus:border-[#3FD8FF]"
            >
              {windowTimestamps.map((item) => (
                <option key={item.timestamp} value={item.timestamp}>
                  {item.timestamp} IST — {item.demand_met_mw.toLocaleString()} MW{' '}
                  {item.has_ground_truth_4h
                    ? '(Historical Backtest Verified)'
                    : '(Forward From Watermark)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#A8B5C5] mb-2">
              3. ACTIVE MODEL ARTIFACT & HORIZON
            </label>
            <div className="bg-[#0D1524] border border-white/12 rounded px-3.5 py-2 text-xs font-mono flex items-center justify-between">
              <span className="text-[#3FD8FF] truncate">{activeArtifactObj.artifact_id}</span>
              <span className="text-[#C6FF2E] shrink-0 ml-2">+4.0h (16 intervals)</span>
            </div>
          </div>
        </div>
      </div>

      {/* PLAIN-ENGLISH & TECHNICAL COMPATIBILITY BLOCK WHEN ARTIFACT MISMATCHES (HTTP 409) */}
      {!isCompatible || (inferenceResult && !inferenceResult.ok) ? (
        <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-6 lg:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-red-500/30 pb-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>HTTP 409 · BLOCKED_ARTIFACT_MISMATCH</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-[#F4F6FA]">
                Why This Forecast Was Blocked (Plain-English Explanation)
              </h3>
            </div>
            <button
              onClick={() =>
                handleArtifactModeSwitch('residual_hgb_flexible__source_hour_shrinkage')
              }
              className="px-5 py-2.5 text-xs font-mono font-semibold text-[#0D1524] bg-[#C6FF2E] hover:bg-[#C6FF2E]/90 rounded transition-colors shrink-0 cursor-pointer"
            >
              Restore Compatible Frozen Artifact
            </button>
          </div>

          <p className="text-sm lg:text-base text-[#F4F6FA]/90 leading-relaxed">
            In production energy systems, running a machine-learning model with the wrong feature
            pipeline or missing calibration weights can silently produce dangerous forecast errors.
            Right now, the loaded model file (<code className="text-red-300">{activeArtifactObj.artifact_id}</code>)
            only expects <strong>{activeArtifactObj.feature_names.length} features</strong> and
            lacks source-hour shrinkage, whereas our verified configuration (
            <code className="text-[#3FD8FF]">{metadata.frozen_config.config_path}</code>) requires{' '}
            <strong>{exactFeatureCount} causal features</strong> and empirical shrinkage. GridSense
            AI automatically halts prediction generation until the matching artifact is restored.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0D1524]/90 border border-red-500/30 rounded p-4">
              <div className="text-xs font-mono text-red-300 mb-2">
                EXACT CONFIGURATION MISMATCHES DETECTED
              </div>
              <ul className="space-y-1.5 text-xs font-mono text-[#F4F6FA]">
                {metadata.compatibility.mismatch_reasons.map((reason, idx) => (
                  <li key={idx}>· {reason}</li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0D1524]/90 border border-white/12 rounded p-4">
              <div className="text-xs font-mono text-[#3FD8FF] mb-2">
                SAFE REMEDIATION STEPS
              </div>
              <ul className="space-y-1.5 text-xs font-mono text-[#A8B5C5]">
                {metadata.compatibility.remediation_steps.map((step, idx) => (
                  <li key={idx}>
                    {idx + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* VERIFIED FORECAST OUTPUT SUMMARY */
        inferenceResult && (
          <div className="space-y-6">
            <div className="bg-[#202D40] border border-white/15 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#C6FF2E] shrink-0" />
                <span className="text-[#A8B5C5]">PREDICTION CONTEXT:</span>
                <span className="text-[#C6FF2E] font-semibold">
                  {inferenceResult.prediction_mode_label}
                </span>
              </div>
              <div className="text-xs font-mono text-[#3FD8FF]">
                Model: {inferenceResult.model_id} · Compatibility: VERIFIED ({exactFeatureCount}{' '}
                Features)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#A8B5C5]">FORECAST ISSUE TIME (t)</div>
                <div className="font-mono text-base font-bold text-[#F4F6FA] mt-2 tabular-nums">
                  {inferenceResult.issue_timestamp}
                </div>
                <div className="text-[11px] font-mono text-[#718096] mt-1">
                  IST (UTC+05:30)
                </div>
              </div>

              <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#3FD8FF]">
                  FORECAST TARGET (+4H)
                </div>
                <div className="font-mono text-base font-bold text-[#3FD8FF] mt-2 tabular-nums">
                  {inferenceResult.target_timestamp}
                </div>
                <div className="text-[11px] font-mono text-[#718096] mt-1">
                  +16 × 15m intervals
                </div>
              </div>

              <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#A8B5C5]">OBSERVED DEMAND AT (t)</div>
                <div className="font-mono text-xl font-bold text-[#F4F6FA] mt-2 tabular-nums">
                  {inferenceResult.latest_observed_demand_mw?.toLocaleString()} MW
                </div>
                <div className="text-[11px] font-mono text-[#718096] mt-1">
                  Starting load level
                </div>
              </div>

              <div className="bg-[#172235] border border-[#C6FF2E]/50 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#C6FF2E]">
                  PREDICTED DEMAND (t+4H)
                </div>
                <div className="font-mono text-xl font-bold text-[#C6FF2E] mt-2 tabular-nums">
                  {inferenceResult.predicted_demand_mw?.toLocaleString()} MW
                </div>
                <div className="text-[11px] font-mono text-[#A8B5C5] mt-1">
                  Shrinkage α={inferenceResult.shrinkage_alpha} (
                  {inferenceResult.shrinkage_window})
                </div>
              </div>

              <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#A8B5C5]">
                  4-HOUR DEMAND CHANGE
                </div>
                <div className="font-mono text-xl font-bold text-[#3FD8FF] mt-2 tabular-nums">
                  {(inferenceResult.delta_vs_issue_mw ?? 0) >= 0 ? '+' : ''}
                  {inferenceResult.delta_vs_issue_mw?.toLocaleString()} MW
                </div>
                <div className="text-[11px] font-mono text-[#718096] mt-1 tabular-nums">
                  vs Naive: {(inferenceResult.delta_vs_seasonal_naive_mw ?? 0) >= 0 ? '+' : ''}
                  {inferenceResult.delta_vs_seasonal_naive_mw?.toLocaleString()} MW
                </div>
              </div>

              <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                <div className="text-[11px] font-mono text-[#A8B5C5]">
                  ACTUAL TARGET DEMAND
                </div>
                {inferenceResult.actual_target_demand_mw !== null &&
                inferenceResult.actual_target_demand_mw !== undefined ? (
                  <>
                    <div className="font-mono text-xl font-bold text-[#F4F6FA] mt-2 tabular-nums">
                      {inferenceResult.actual_target_demand_mw.toLocaleString()} MW
                    </div>
                    <div className="text-[11px] font-mono text-[#C6FF2E] mt-1 tabular-nums">
                      Error: {(inferenceResult.prediction_error_mw ?? 0) >= 0 ? '+' : ''}
                      {inferenceResult.prediction_error_mw?.toLocaleString()} MW
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-mono text-xs font-bold text-amber-400 mt-2">
                      BEYOND WATERMARK
                    </div>
                    <div className="text-[11px] font-mono text-[#718096] mt-1">
                      &gt; 2026-09-29 23:45
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* VISUAL INPUT FEATURE VECTOR — EXACT FEATURE NAMES, TIMESTAMPS & PLAIN-ENGLISH ROLES */}
      <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/12 pb-4">
          <div>
            <div className="text-xs font-mono text-[#3FD8FF]">
              VISUAL MODEL INPUT VECTOR · {exactFeatureCount} CAUSAL FEATURES FROM FROZEN CONFIG
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-1">
              What the Model Sees at Issue Time ({issueTimeStr} IST)
            </h3>
            <p className="text-xs text-[#A8B5C5] mt-1">
              Every feature below is computed strictly from observations at or before the forecast
              issue time <code className="text-[#3FD8FF]">t</code>. Zero future information is used.
            </p>
          </div>
          <div className="text-xs font-mono text-[#C6FF2E] bg-[#0D1524] border border-white/12 px-3 py-1.5 rounded">
            Feature Count in Active Artifact: {activeArtifactObj.feature_names.length} /{' '}
            {exactFeatureCount}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {detailedFeatures.map((f, index) => {
            const presentInActiveArtifact = activeArtifactObj.feature_names.includes(f.name);
            return (
              <div
                key={f.name}
                className={`p-4 rounded-lg border flex flex-col justify-between space-y-3 ${
                  presentInActiveArtifact
                    ? 'bg-[#0D1524]/85 border-white/12'
                    : 'bg-red-950/25 border-red-500/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#3FD8FF]">
                      FEATURE 0{index + 1} · {f.name}
                    </span>
                    <span
                      className={presentInActiveArtifact ? 'text-[#C6FF2E]' : 'text-red-400'}
                    >
                      {presentInActiveArtifact ? 'ACTIVE' : 'MISSING IN ARTIFACT'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 pt-1">
                    <span className="font-display text-sm font-bold text-[#F4F6FA]">
                      {f.label}
                    </span>
                    <span className="font-mono text-base font-bold text-[#C6FF2E] tabular-nums">
                      {f.observedValStr}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[#A8B5C5] bg-[#172235] px-2.5 py-1 rounded border border-white/8">
                    Refers to: {f.timestampRef}
                  </div>

                  <p className="text-xs text-[#A8B5C5] leading-relaxed pt-1">
                    <strong className="text-[#F4F6FA]">Why it matters: </strong>
                    {f.whyItMatters}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LARGE ACTUAL vs PREDICTED vs SEASONAL NAIVE CHART + ERROR DISTRIBUTION */}
      <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/12 pb-4">
          <div>
            <div className="text-xs font-mono text-[#3FD8FF]">
              ACTUAL vs. PREDICTED vs. SEASONAL NAIVE BASELINE · {selectedWindow.replace('_', ' ')}
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-1">
              4-Hour Forecast Trajectory & Prediction Error Comparison (MW)
            </h3>
          </div>
          <div className="text-xs font-mono text-[#C6FF2E]">
            Vertical Marker: Selected Issue Time ({selectedTimestamp})
          </div>
        </div>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historySeries} margin={{ top: 10, right: 20, left: 15, bottom: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(v: string) => v.slice(5)}
                minTickGap={25}
              />
              <YAxis
                tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k MW`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1524',
                  borderColor: 'rgba(255,255,255,0.18)',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: '12px',
                }}
                formatter={(val, name) => [
                  val !== null && val !== undefined
                    ? `${Number(val).toLocaleString()} MW`
                    : 'Beyond Watermark',
                  String(name ?? ''),
                ]}
              />
              <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '12px' }} />
              <ReferenceLine
                x={selectedTimestamp}
                stroke="#C6FF2E"
                strokeDasharray="3 3"
                label={{
                  value: 'Issue Time (t)',
                  fill: '#C6FF2E',
                  fontSize: 11,
                  position: 'top',
                }}
              />
              <Line
                type="monotone"
                dataKey="actual_demand_4h_ahead_mw"
                name="Actual Demand at Target (t+4h)"
                stroke="#3FD8FF"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="historical_backtest_pred_mw"
                name="Candidate Residual HGB Forecast (t+4h)"
                stroke="#C6FF2E"
                strokeWidth={2.2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="seasonal_naive_pred_mw"
                name="24h Seasonal Naive Baseline (t+4h)"
                stroke="#A8B5C5"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
              <Brush
                dataKey="timestamp"
                height={24}
                stroke="#3FD8FF"
                fill="#0D1524"
                tickFormatter={(v: string) => v.slice(11)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Companion Residual Error Bar Chart */}
        <div className="pt-4 border-t border-white/10">
          <div className="text-xs font-mono text-[#A8B5C5] mb-3">
            4-HOUR PREDICTION ERROR (PREDICTED MINUS ACTUAL MW) — NEGATIVE VALUES INDICATE
            UNDERFORECASTING
          </div>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historySeries} margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#718096', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  tickFormatter={(v: string) => v.slice(11)}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: '#718096', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  tickFormatter={(v: number) => `${v} MW`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1524',
                    borderColor: 'rgba(255,255,255,0.18)',
                    fontFamily: 'IBM Plex Mono',
                    fontSize: '11px',
                  }}
                  formatter={(v) => [
                    v !== null && v !== undefined ? `${Number(v).toLocaleString()} MW` : 'N/A',
                    'Prediction Error (Pred - Actual)',
                  ]}
                />
                <ReferenceLine y={0} stroke="#A8B5C5" />
                <Bar
                  dataKey="prediction_error_mw"
                  name="Prediction Error (MW)"
                  fill="#3FD8FF"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
