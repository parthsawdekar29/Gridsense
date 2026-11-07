/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Cpu,
  Database,
  Play,
  Settings,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import { LandingExperience } from './components/LandingExperience';
import {
  DemandForecastView,
  OverviewView,
} from './components/views/OverviewAndForecastViews';
import {
  DataHealthView,
  ModelPerformanceView,
} from './components/views/PerformanceAndDataHealthViews';
import {
  GridRiskView,
  ScenarioExplorerView,
} from './components/views/ScenarioAndRiskViews';
import {
  BiasAnalysisResponse,
  DashboardTabId,
  DataProvenanceResponse,
  ForecastMetadataResponse,
  ModelPerformanceResponse,
  OverviewResponse,
  RecommendationsResponse,
  RiskStatusResponse,
  RollingOriginWindow,
} from './types/gridsense';
import hubCoreImg from './assets/images/grid_hub_control_core_1794041478133.jpg';
import renewableCorridorImg from './assets/images/renewable_solar_wind_corridor_1794041476824.jpg';
import batterySubstationImg from './assets/images/battery_storage_substation_1794041477807.jpg';

const NORVA_POSTER_BG =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/33150b94-09f7-47da-a7c9-3ae76c2dd7eb.jpg';

interface DemoStepConfig {
  stepNumber: number;
  title: string;
  viewMode: 'landing' | 'dashboard';
  tab?: DashboardTabId;
  plainEnglishExplanation: string;
  highlightedArea: string;
}

const HACKATHON_DEMO_STEPS: DemoStepConfig[] = [
  {
    stepNumber: 1,
    title: 'Stage 1 — Isometric Night-Grid Glide & 3D Digital Twin',
    viewMode: 'landing',
    plainEnglishExplanation:
      'Electricity grids must balance supply and demand every second. Scroll through the isometric night grid to see how GridSense AI connects 64,860 15-minute SCADA observations with causal 4-hour machine learning.',
    highlightedArea: 'NORVA Isometric Glide, Pinging Hotspots & 3D WebGL Digital Twin',
  },
  {
    stepNumber: 2,
    title: 'Stage 2 — Four-Hour Demand Forecasting & Visual Input Vector',
    viewMode: 'dashboard',
    tab: 'forecast',
    plainEnglishExplanation:
      'Here our frozen Residual HistGradientBoosting model predicts national demand 16 fifteen-minute intervals (+4 hours) ahead. Inspect the 9 causal features it uses and test the Artifact Safeguard that blocks mismatched model files.',
    highlightedArea: 'Visual 9-Feature Input Vector & Actual-vs-Predicted Chart',
  },
  {
    stepNumber: 3,
    title: 'Stage 3 — Model Performance & Where the Model Struggles',
    viewMode: 'dashboard',
    tab: 'performance',
    plainEnglishExplanation:
      'Tested chronologically across 17,472 intervals, our model cuts average error by 42.0% compared with yesterday’s same-hour baseline (3,150.4 MW vs 5,433.4 MW MAE). We also transparently expose its -1,142.8 MW underforecast bias during the 2026 Q3 monsoon humidity surge.',
    highlightedArea: '5-Model Benchmark, Error Histogram & 2026 Q3 Bias Disclosure',
  },
  {
    stepNumber: 4,
    title: 'Stage 4 — Data Health, Provenance & Scheduled vs. Measured Supply',
    viewMode: 'dashboard',
    tab: 'data-health',
    plainEnglishExplanation:
      'Trust starts with data integrity. Inspect our SHA-256 dataset lineage, the 2026-09-29 23:45 IST watermark lock, and why scheduled generation (total_gen_mw) is strictly separated from measured demand (demand_met_mw).',
    highlightedArea: 'Data Lineage Diagram & Field Comparison Cards',
  },
  {
    stepNumber: 5,
    title: 'Stage 5 — Interactive Scenario Laboratory',
    viewMode: 'dashboard',
    tab: 'scenario',
    plainEnglishExplanation:
      'Use the controls on the left to test hypothetical demand surges, solar/wind shifts, and battery storage peak-shaving assumptions against recorded SCADA baselines — clearly separating simulation assumptions from real measurements.',
    highlightedArea: 'Left Scenario Controls & Right Dynamic Trajectory / BESS SOC',
  },
  {
    stepNumber: 6,
    title: 'Stage 6 — Grid Risk, Renewable Intelligence & Recommendations',
    viewMode: 'dashboard',
    tab: 'grid-risk',
    plainEnglishExplanation:
      'Explore our 3D spatial twin and schematic topology, six risk dimensions in Limited Data Mode, leakage-free renewable weather design, and evidence-backed operational recommendations.',
    highlightedArea: '3D Digital Twin, Risk Matrix & Decision-Support Insights',
  },
  {
    stepNumber: 7,
    title: 'Stage 7 — Closing: From Reactive Management to Predictive Intelligence',
    viewMode: 'dashboard',
    tab: 'overview',
    plainEnglishExplanation:
      'GridSense AI brings authentic SCADA data, validated machine learning, scenario simulation, and transparent risk boundaries into one cohesive NORVA × MOSSLINE control centre.',
    highlightedArea: '5-Stage System Pipeline & Dominant National Demand Timeline',
  },
];

const NAV_ITEMS: Array<{
  id: DashboardTabId;
  num: string;
  label: string;
  shortDesc: string;
  chipLabel: string;
  pageHeading: string;
  pagePurpose: string;
  statMetric: string;
  statSub: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'overview',
    num: '01',
    label: 'Overview',
    shortDesc: 'System & 3D Telemetry',
    chipLabel: 'STATION 01 · NATIONAL TELEMETRY HUB',
    pageHeading: 'National Grid Intelligence Overview',
    pagePurpose:
      'Inspect the verified SCADA snapshot watermark, four-hour forecasting accuracy, interactive 3D digital twin, and end-to-end system pipeline.',
    statMetric: '64,860',
    statSub: '15m SCADA Intervals · 164 Cols',
    icon: Activity,
  },
  {
    id: 'forecast',
    num: '02',
    label: 'Demand Forecast',
    shortDesc: '4h Residual HGB Engine',
    chipLabel: 'STATION 02 · +4.0H CAUSAL INFERENCE',
    pageHeading: 'Four-Hour Electricity Demand Forecast',
    pagePurpose:
      'Examine how the frozen Residual HistGradientBoosting engine combines 9 causal historical features with source-hour shrinkage to predict load 16 intervals ahead.',
    statMetric: '3,150.4',
    statSub: 'MW Pooled MAE (-42.0% vs Naive)',
    icon: Cpu,
  },
  {
    id: 'performance',
    num: '03',
    label: 'Model Performance',
    shortDesc: 'Rolling-Origin & Q3 Bias',
    chipLabel: 'STATION 03 · CHRONOLOGICAL VALIDATION',
    pageHeading: 'Chronological Evaluation & Bias Audit',
    pagePurpose:
      'Audit out-of-sample MAE, RMSE, and R² benchmarks across 2025 Q3, 2026 Q1, and 2026 Q3 — including the documented -1,142.8 MW monsoon underforecast bias.',
    statMetric: '0.965',
    statSub: 'Pooled R² · 17,472 Test Samples',
    icon: BarChart3,
  },
  {
    id: 'data-health',
    num: '04',
    label: 'Data Health',
    shortDesc: 'SCADA Provenance & Audit',
    chipLabel: 'STATION 04 · SHA-256 PROVENANCE LOCK',
    pageHeading: 'SCADA Provenance, Lineage & Quality Audit',
    pagePurpose:
      'Verify dataset integrity, SHA-256 hashes, 15-minute cadence checks, and the strict physical boundary between measured demand and scheduled generation.',
    statMetric: '100.0%',
    statSub: 'Timestamp Cadence Integrity',
    icon: Database,
  },
  {
    id: 'scenario',
    num: '05',
    label: 'Scenario Lab',
    shortDesc: 'Hypothetical Load & BESS',
    chipLabel: 'STATION 05 · COUNTERFACTUAL SANDBOX',
    pageHeading: 'Interactive Energy Scenario Laboratory',
    pagePurpose:
      'Simulate hypothetical demand shocks, solar/wind variability, and user-parameterized battery storage dispatch against recorded SCADA baselines.',
    statMetric: '+4.0h',
    statSub: 'Counterfactual Dispatch Horizon',
    icon: Sliders,
  },
  {
    id: 'grid-risk',
    num: '06',
    label: 'Grid Risk',
    shortDesc: '3D Twin & Risk Matrix',
    chipLabel: 'STATION 06 · LIMITED DATA MODE GUARD',
    pageHeading: 'Grid Risk, 3D Topology & Recommendations',
    pagePurpose:
      'Evaluate six grid stress dimensions in Limited Data Mode, explore solar/wind ramp causality, and review evidence-backed operational recommendations.',
    statMetric: '6 Dims',
    statSub: 'Transparent Risk Classification',
    icon: ShieldAlert,
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Guided 7-Stage Demo Mode
  const [demoActive, setDemoActive] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);

  // Backend data states
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null);
  const [forecastMetadata, setForecastMetadata] = useState<ForecastMetadataResponse | null>(null);
  const [performanceData, setPerformanceData] = useState<ModelPerformanceResponse | null>(null);
  const [rollingWindows, setRollingWindows] = useState<RollingOriginWindow[]>([]);
  const [biasAnalysis, setBiasAnalysis] = useState<BiasAnalysisResponse | null>(null);
  const [provenanceData, setProvenanceData] = useState<DataProvenanceResponse | null>(null);
  const [riskStatus, setRiskStatus] = useState<RiskStatusResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);

  const loadAllPlatformData = useCallback(async () => {
    try {
      const [
        ovRes,
        fcMetaRes,
        perfRes,
        rollRes,
        biasRes,
        provRes,
        riskRes,
        recRes,
      ] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/forecast/metadata'),
        fetch('/api/model/performance'),
        fetch('/api/model/rolling-origin'),
        fetch('/api/model/bias'),
        fetch('/api/data/metadata'),
        fetch('/api/risk/status'),
        fetch('/api/recommendations'),
      ]);

      const [ov, fcMeta, perf, roll, bias, prov, risk, rec] = await Promise.all([
        ovRes.json(),
        fcMetaRes.json(),
        perfRes.json(),
        rollRes.json(),
        biasRes.json(),
        provRes.json(),
        riskRes.json(),
        recRes.json(),
      ]);

      setOverviewData(ov);
      setForecastMetadata(fcMeta);
      setPerformanceData(perf);
      setRollingWindows(roll.windows || []);
      setBiasAnalysis(bias);
      setProvenanceData(prov);
      setRiskStatus(risk);
      setRecommendations(rec);
    } catch (error) {
      console.error('Failed to load GridSense platform data:', error);
    }
  }, []);

  useEffect(() => {
    loadAllPlatformData();
  }, [loadAllPlatformData]);

  const handleLaunchDashboard = (initialTab: DashboardTabId = 'overview') => {
    setActiveTab(initialTab);
    setViewMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyDemoStep = (index: number) => {
    const step = HACKATHON_DEMO_STEPS[index];
    if (!step) return;
    setDemoStepIndex(index);
    setViewMode(step.viewMode);
    if (step.tab) {
      setActiveTab(step.tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDemoMode = () => {
    setDemoActive(true);
    applyDemoStep(0);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const y = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  };

  const handleCardPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
  };

  const currentNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const isCompatible = forecastMetadata?.compatibility.compatible ?? true;

  return (
    <div className="min-h-screen bg-[#0f1626] text-[#f4f6fa]">
      {/* GUIDED 7-STAGE HACKATHON PRESENTATION HUD */}
      {demoActive && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-5xl mx-auto bg-[#0f1626]/95 backdrop-blur-xl border border-[#c6ff2e]/60 rounded-xl p-5 shadow-2xl space-y-3">
          <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
            <div
              className="h-full bg-[#c6ff2e] transition-all duration-300"
              style={{
                width: `${((demoStepIndex + 1) / HACKATHON_DEMO_STEPS.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="gs-chip">
                  STAGE {demoStepIndex + 1} / {HACKATHON_DEMO_STEPS.length}
                </span>
                <span className="text-[#3fd8ff]">
                  Focus: {HACKATHON_DEMO_STEPS[demoStepIndex].highlightedArea}
                </span>
              </div>
              <div className="font-display text-lg font-semibold text-[#f4f6fa]">
                {HACKATHON_DEMO_STEPS[demoStepIndex].title}
              </div>
              <p className="text-xs sm:text-sm text-[#f4f6fa]/75 leading-relaxed max-w-3xl">
                {HACKATHON_DEMO_STEPS[demoStepIndex].plainEnglishExplanation}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={demoStepIndex === 0}
                onClick={() => applyDemoStep(Math.max(0, demoStepIndex - 1))}
                className="nv-pill nv-pill-grey disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>PREV</span>
              </button>

              {demoStepIndex < HACKATHON_DEMO_STEPS.length - 1 ? (
                <button
                  onClick={() => applyDemoStep(demoStepIndex + 1)}
                  className="nv-pill nv-pill-lime"
                >
                  <span>NEXT STAGE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setDemoActive(false)}
                  className="nv-pill nv-pill-lime"
                >
                  <span>FINISH</span>
                </button>
              )}

              <button
                onClick={() => setDemoActive(false)}
                aria-label="Exit Demo Mode"
                className="p-2 text-[#f4f6fa]/70 hover:text-[#f4f6fa] bg-white/5 border border-white/15 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'landing' ? (
        <LandingExperience
          onLaunchDashboard={handleLaunchDashboard}
          onStartDemoMode={handleStartDemoMode}
        />
      ) : (
        /* ===================================================================
           NORVA × MOSSLINE UNIFIED GRIDSENSE AI CONTROL CENTRE
           =================================================================== */
        <div className="gs-control-centre">
          {/* Atmospheric Isometric Night-City Backdrop behind Frosted Glass */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <img
              src={NORVA_POSTER_BG}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover opacity-20 scale-105"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 22%, rgba(15,22,38,0.68) 0%, rgba(13,21,36,0.95) 72%)',
              }}
            />
          </div>

          {/* 1. NORVA FIXED 3-COLUMN TOP COMMAND BAR */}
          <header className="nv-nav" style={{ background: 'rgba(15, 22, 38, 0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="nv-nav-left">
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                className="nv-nav-link"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#c6ff2e]" />
                <span>SCROLL STORY</span>
              </button>
              <span className="hidden xl:inline-flex items-center gap-2 font-mono text-[11px] text-[#f4f6fa]/70">
                <span className="gs-chip">
                  {isCompatible ? 'FROZEN v1 ALIGNED' : 'ARTIFACT MISMATCH'}
                </span>
                <span>WATERMARK: 2026-09-29 23:45 IST</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('landing')}
              className="nv-wordmark"
            >
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <polygon
                  points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5"
                  stroke="#3fd8ff"
                  strokeWidth="2"
                  fill="#0f1626"
                />
                <circle cx="16" cy="16" r="3.2" fill="#c6ff2e" />
              </svg>
              <span>GRIDSENSE AI</span>
            </button>

            <div className="nv-nav-right">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="nv-pill nv-pill-grey"
              >
                <Settings className="w-3.5 h-3.5 text-[#3fd8ff]" />
                <span className="hidden sm:inline">FROZEN SPEC</span>
              </button>
              <button
                type="button"
                onClick={handleStartDemoMode}
                className="nv-pill nv-pill-lime"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{demoActive ? 'RESTART TOUR' : '7-STAGE TOUR'}</span>
              </button>
            </div>
          </header>

          {/* 2. NORVA 6-MODULE PROCESS RIBBON & MOSSLINE FROSTED HERO STAGE */}
          <div className="relative z-10 pt-24 pb-10 px-6 lg:px-10 max-w-[1420px] mx-auto space-y-8">
            {/* 6-Module NORVA Step Selector Bar */}
            <nav
              aria-label="GridSense Intelligence Modules"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5"
            >
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`nv-mod-tab ${active ? 'is-active' : ''}`}
                  >
                    <span className="nv-mod-badge">{item.num}</span>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-semibold truncate">
                        {item.label}
                      </div>
                      <div className="font-mono text-[10px] text-[#f4f6fa]/55 truncate">
                        {item.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* NORVA × MOSSLINE Module Hero Split: Editorial Title + Frosted Glass Sparkline Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2 border-b border-white/15 pb-8">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="gs-chip">{currentNavMeta.chipLabel}</span>
                  <span className="gs-chip-cyan">
                    {isCompatible
                      ? 'CANDIDATE: residual_hgb_flexible__source_hour_shrinkage'
                      : 'SAFEGUARD: HTTP 409 BLOCKED'}
                  </span>
                </div>
                <h1
                  className="font-display font-semibold text-[#f4f6fa]"
                  style={{
                    fontSize: 'clamp(32px, 3.8vw, 56px)',
                    lineHeight: 0.98,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {currentNavMeta.pageHeading}
                </h1>
                <p className="text-sm sm:text-base text-[#f4f6fa]/72 max-w-3xl leading-relaxed">
                  {currentNavMeta.pagePurpose}
                </p>
              </div>

              {/* Right: Mossline Frosted Glass Station Card */}
              <div className="lg:col-span-4">
                <div className="gs-glass-card">
                  <span className="gs-glass-tag">-42.0% MAE</span>
                  <h4>{currentNavMeta.label} Telemetry</h4>
                  <div className="gs-glass-sub">{currentNavMeta.shortDesc}</div>
                  <div className="gs-glass-metric-row">
                    <span className="gs-glass-big">{currentNavMeta.statMetric}</span>
                    <span className="gs-glass-unit">{currentNavMeta.statSub}</span>
                  </div>
                  <svg className="gs-spark-svg" viewBox="0 0 220 54" fill="none">
                    <polyline
                      points="0,46 32,42 64,44 96,33 128,35 160,22 190,17 216,8"
                      stroke="#c6ff2e"
                      strokeWidth="1.8"
                      fill="none"
                    />
                    <circle cx="96" cy="33" r="2.5" fill="#ffffff" />
                    <circle cx="160" cy="22" r="2.5" fill="#3fd8ff" />
                    <circle cx="216" cy="8" r="3.4" fill="#c6ff2e" />
                  </svg>
                  <div className="gs-glass-foot">
                    <span>WATERMARK 2026-09-29</span>
                    <span style={{ color: '#c6ff2e' }}>R² = 0.965</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ACTIVE ANALYTICAL MODULE VIEWPORT */}
            <main className="pb-16">
              {activeTab === 'overview' && (
                <OverviewView
                  overview={overviewData}
                  recommendations={recommendations}
                  onNavigateTab={(t) => setActiveTab(t)}
                />
              )}

              {activeTab === 'forecast' && (
                <DemandForecastView
                  metadata={forecastMetadata}
                  onRefreshMetadata={loadAllPlatformData}
                />
              )}

              {activeTab === 'performance' && (
                <ModelPerformanceView
                  performance={performanceData}
                  rollingWindows={rollingWindows}
                  biasAnalysis={biasAnalysis}
                />
              )}

              {activeTab === 'data-health' && <DataHealthView provenance={provenanceData} />}

              {activeTab === 'scenario' && <ScenarioExplorerView />}

              {activeTab === 'grid-risk' && (
                <GridRiskView riskStatus={riskStatus} recommendations={recommendations} />
              )}
            </main>
          </div>

          {/* 4. MOSSLINE SLIDING ROUNDED WHITE SOLUTIONS & MODULE SWITCHER FOOTER (#sol) */}
          <section id="sol" style={{ marginTop: '0' }}>
            <div className="sol-container">
              <div className="sol-head">
                <div>
                  <span className="gs-chip">Continue Exploring GridSense AI</span>
                  <h2>Connected intelligence across every grid horizon</h2>
                </div>
                <p>
                  Switch seamlessly between our 4-hour Residual HGB forecast engine, SHA-256 SCADA
                  provenance ledger, and counterfactual battery storage laboratory.
                </p>
              </div>

              <div className="sol-cards">
                <div
                  className="sol-card"
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={handleCardPointerLeave}
                  onClick={() => {
                    setActiveTab('forecast');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div
                    className="sol-card-bg"
                    style={{ backgroundImage: `url("${hubCoreImg}")` }}
                  />
                  <div className="sol-card-ov" />
                  <div className="sol-card-top">
                    <span className="sol-card-label">[02 · Demand Forecast]</span>
                    <span className="sol-card-circle">→</span>
                  </div>
                  <div className="sol-card-bot">
                    <h3>
                      4-Hour Residual HGB
                      <br />
                      &amp; Artifact Safeguard
                    </h3>
                    <p>
                      Inspect the 9 causal historical features and test the HTTP 409 artifact
                      compatibility safeguard live.
                    </p>
                  </div>
                </div>

                <div
                  className="sol-card"
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={handleCardPointerLeave}
                  onClick={() => {
                    setActiveTab('performance');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div
                    className="sol-card-bg"
                    style={{ backgroundImage: `url("${renewableCorridorImg}")` }}
                  />
                  <div className="sol-card-ov" />
                  <div className="sol-card-top">
                    <span className="sol-card-label">[03 · Model Performance]</span>
                    <span className="sol-card-circle">→</span>
                  </div>
                  <div className="sol-card-bot">
                    <h3>
                      Rolling-origin metrics
                      <br />
                      &amp; 2026 Q3 monsoon bias
                    </h3>
                    <p>
                      Compare 5 model families across 17,472 intervals and inspect the documented
                      -1,142.8 MW monsoon underforecast bias.
                    </p>
                  </div>
                </div>

                <div
                  className="sol-card"
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={handleCardPointerLeave}
                  onClick={() => {
                    setActiveTab('scenario');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div
                    className="sol-card-bg"
                    style={{ backgroundImage: `url("${batterySubstationImg}")` }}
                  />
                  <div className="sol-card-ov" />
                  <div className="sol-card-top">
                    <span className="sol-card-label">[05 · Scenario Lab]</span>
                    <span className="sol-card-circle">→</span>
                  </div>
                  <div className="sol-card-bot">
                    <h3>
                      Counterfactual load shocks
                      <br />
                      &amp; BESS peak-shaving
                    </h3>
                    <p>
                      Simulate demand surges, solar/wind deltas, and utility battery storage
                      trajectories against recorded SCADA baselines.
                    </p>
                  </div>
                </div>
              </div>

              <div className="sol-stats">
                <div className="sol-stat">
                  <div className="sol-stat-num">64,860</div>
                  <div className="sol-stat-lbl">Verified 15m SCADA intervals</div>
                </div>
                <div className="sol-stat">
                  <div className="sol-stat-num">-42.0%</div>
                  <div className="sol-stat-lbl">MAE reduction vs Seasonal Naive</div>
                </div>
                <div className="sol-stat">
                  <div className="sol-stat-num">0.965</div>
                  <div className="sol-stat-lbl">Pooled out-of-sample R² fit</div>
                </div>
                <div className="sol-stat">
                  <div className="sol-stat-num">17,472</div>
                  <div className="sol-stat-lbl">Chronological evaluation samples</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* System Configuration Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#172235] border border-white/20 rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/12 pb-3">
              <h3 className="font-display text-lg font-bold text-[#F4F6FA]">
                GridSense AI — Frozen Research &amp; Runtime Configuration
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-[#A8B5C5] hover:text-[#F4F6FA] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 bg-[#0D1524] rounded border border-white/10">
                <div className="text-[#3FD8FF]">FROZEN PROSPECTIVE CONFIGURATION</div>
                <div className="text-[#F4F6FA] mt-0.5">
                  configs/experiments/demand_4h_prospective_v1.json
                </div>
              </div>
              <div className="p-3 bg-[#0D1524] rounded border border-white/10">
                <div className="text-[#C6FF2E]">FROZEN CANDIDATE MODEL</div>
                <div className="text-[#F4F6FA] mt-0.5">
                  residual_hgb_flexible__source_hour_shrinkage
                </div>
              </div>
              <div className="p-3 bg-[#0D1524] rounded border border-white/10">
                <div className="text-amber-400">NON-NEGOTIABLE DATA SAFEGUARDS</div>
                <ul className="mt-1 space-y-1 text-[#A8B5C5]">
                  <li>· Zero synthetic historical measurements</li>
                  <li>· total_gen_mw isolated as scheduled generation proxy only</li>
                  <li>· Artifact compatibility verified prior to inference</li>
                  <li>· Prospective gate enforced at 2026-09-29 23:45 IST watermark</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="nv-pill nv-pill-lime"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
