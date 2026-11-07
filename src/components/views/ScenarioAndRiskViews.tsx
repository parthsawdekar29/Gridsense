import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Download,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
  RecommendationsResponse,
  RiskStatusResponse,
  SavedScenarioItem,
  ScenarioSimulationResponse,
} from '../../types/gridsense';
import { SmartGrid3DScene } from '../three/SmartGrid3DScene';

// Illustrative diurnal profile for Renewable Intelligence (explicitly labelled illustrative)
const ILLUSTRATIVE_RENEWABLE_VARIABILITY_PROFILE = [
  { hour: '00:00', solar_mw: 0, wind_mw: 14200, gross_demand_mw: 202000, net_load_mw: 187800 },
  { hour: '03:00', solar_mw: 0, wind_mw: 15100, gross_demand_mw: 196000, net_load_mw: 180900 },
  { hour: '06:00', solar_mw: 1800, wind_mw: 13400, gross_demand_mw: 208000, net_load_mw: 192800 },
  { hour: '09:00', solar_mw: 24500, wind_mw: 11200, gross_demand_mw: 221000, net_load_mw: 185300 },
  { hour: '12:00', solar_mw: 42800, wind_mw: 9800, gross_demand_mw: 226000, net_load_mw: 173400 },
  { hour: '15:00', solar_mw: 34200, wind_mw: 11600, gross_demand_mw: 224000, net_load_mw: 178200 },
  { hour: '18:00', solar_mw: 3200, wind_mw: 14900, gross_demand_mw: 231000, net_load_mw: 212900 },
  { hour: '20:00', solar_mw: 0, wind_mw: 16400, gross_demand_mw: 238500, net_load_mw: 222100 },
  { hour: '22:00', solar_mw: 0, wind_mw: 15600, gross_demand_mw: 224000, net_load_mw: 208400 },
];

export const ScenarioExplorerView: React.FC = () => {
  const [windowId, setWindowId] = useState<'2025_Q3' | '2026_Q1' | '2026_Q3'>('2026_Q3');
  const [demandPct, setDemandPct] = useState<number>(3.5);
  const [demandOffsetMw, setDemandOffsetMw] = useState<number>(1200);
  const [solarDeltaMw, setSolarDeltaMw] = useState<number>(1500);
  const [windDeltaMw, setWindDeltaMw] = useState<number>(800);
  const [batteryCapMwh, setBatteryCapMwh] = useState<number>(8000);
  const [batterySocPct, setBatterySocPct] = useState<number>(80);
  const [batteryMaxMw, setBatteryMaxMw] = useState<number>(2400);
  const [batteryEffPct, setBatteryEffPct] = useState<number>(88);

  const [simResult, setSimResult] = useState<ScenarioSimulationResponse | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioItem[]>([]);
  const [scenarioNameInput, setScenarioNameInput] = useState<string>(
    'Q3 High-Humidity Evening Surge (+3.5% Load)'
  );

  const runSimulation = async () => {
    try {
      const res = await fetch('/api/scenario/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          window_id: windowId,
          demand_adjustment_pct: demandPct,
          demand_offset_mw: demandOffsetMw,
          hypothetical_solar_delta_mw: solarDeltaMw,
          hypothetical_wind_delta_mw: windDeltaMw,
          battery_capacity_mwh: batteryCapMwh,
          battery_initial_soc_pct: batterySocPct,
          battery_max_discharge_mw: batteryMaxMw,
          battery_roundtrip_efficiency_pct: batteryEffPct,
        }),
      });
      const data: ScenarioSimulationResponse = await res.json();
      setSimResult(data);
    } catch (e) {
      console.error('Scenario error', e);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [
    windowId,
    demandPct,
    demandOffsetMw,
    solarDeltaMw,
    windDeltaMw,
    batteryCapMwh,
    batterySocPct,
    batteryMaxMw,
    batteryEffPct,
  ]);

  const handleReset = () => {
    setWindowId('2026_Q3');
    setDemandPct(0);
    setDemandOffsetMw(0);
    setSolarDeltaMw(0);
    setWindDeltaMw(0);
    setBatteryCapMwh(0);
    setBatterySocPct(50);
    setBatteryMaxMw(0);
    setBatteryEffPct(88);
  };

  const handleSaveScenario = () => {
    if (!simResult) return;
    const newItem: SavedScenarioItem = {
      id: `scen-${Date.now()}`,
      name:
        scenarioNameInput.trim() ||
        `Scenario ${savedScenarios.length + 1} (${windowId.replace('_', ' ')})`,
      createdAt: new Date().toISOString().slice(11, 19) + ' UTC',
      data: simResult,
    };
    setSavedScenarios((prev) => [newItem, ...prev]);
  };

  const handleExportScenario = () => {
    if (!simResult) return;
    const blob = new Blob([JSON.stringify(simResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridsense_scenario_${windowId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      {/* TOP LABORATORY HEADER */}
      <div className="bg-[#172235] border border-[#3FD8FF]/40 rounded-lg p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-mono text-[#3FD8FF] font-semibold">
            VISUAL ENERGY SCENARIO LABORATORY · HYPOTHETICAL SIMULATION SANDBOX
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F4F6FA]">
            Explore Demand Shocks, Renewable Ramps & Battery Peak-Shaving
          </h2>
          <p className="text-sm lg:text-base text-[#A8B5C5] leading-relaxed">
            Adjust the hypothetical parameters on the left to test how changes in national demand,
            solar/wind output, and utility battery storage affect the recorded Grid-India SCADA
            baseline on the right. Every user-entered value is explicitly treated as a simulation
            assumption.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-xs font-mono text-[#A8B5C5] hover:text-[#F4F6FA] bg-[#0D1524] border border-white/15 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSaveScenario}
            className="px-4 py-2.5 text-xs font-mono text-[#0D1524] font-semibold bg-[#C6FF2E] hover:bg-[#C6FF2E]/90 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save for Comparison</span>
          </button>
          <button
            onClick={handleExportScenario}
            className="px-4 py-2.5 text-xs font-mono text-[#0D1524] font-semibold bg-[#3FD8FF] hover:bg-[#3FD8FF]/90 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* ASYMMETRIC LABORATORY SPLIT: LEFT CONTROLS | RIGHT VISUALIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT SIDE: SCENARIO CONTROLS */}
        <div className="lg:col-span-4 bg-[#172235] border border-white/12 rounded-lg p-6 space-y-6">
          <div className="border-b border-white/12 pb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#F4F6FA]">
              Scenario Controls
            </h3>
            <span className="text-[11px] font-mono text-[#C6FF2E]">HYPOTHETICAL INPUTS</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#A8B5C5] mb-1.5">
              SCENARIO IDENTIFIER
            </label>
            <input
              type="text"
              value={scenarioNameInput}
              onChange={(e) => setScenarioNameInput(e.target.value)}
              className="w-full bg-[#0D1524] border border-white/15 rounded px-3 py-2 text-xs font-mono text-[#F4F6FA]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#A8B5C5] mb-1.5">
              RECORDED BASELINE REFERENCE PERIOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['2025_Q3', '2026_Q1', '2026_Q3'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowId(w)}
                  className={`py-2 text-xs font-mono rounded border cursor-pointer ${
                    windowId === w
                      ? 'bg-[#202D40] border-[#3FD8FF] text-[#F4F6FA] font-semibold'
                      : 'bg-[#0D1524] border-white/12 text-[#A8B5C5]'
                  }`}
                >
                  {w.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Group 1: Demand Adjustments */}
          <div className="pt-3 border-t border-white/10 space-y-4">
            <div className="text-xs font-mono text-[#3FD8FF]">
              1. DEMAND ADJUSTMENT ASSUMPTIONS
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Demand Scaling (%)</span>
                <span className="text-[#3FD8FF] tabular-nums">
                  {demandPct >= 0 ? '+' : ''}
                  {demandPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={-15}
                max={20}
                step={0.5}
                value={demandPct}
                onChange={(e) => setDemandPct(parseFloat(e.target.value))}
                className="w-full accent-[#3FD8FF] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Additive Demand Shift (MW)</span>
                <span className="text-[#3FD8FF] tabular-nums">
                  {demandOffsetMw >= 0 ? '+' : ''}
                  {demandOffsetMw.toLocaleString()} MW
                </span>
              </div>
              <input
                type="range"
                min={-10000}
                max={15000}
                step={200}
                value={demandOffsetMw}
                onChange={(e) => setDemandOffsetMw(parseInt(e.target.value, 10))}
                className="w-full accent-[#3FD8FF] cursor-pointer"
              />
            </div>
          </div>

          {/* Group 2: Solar & Wind Generation Assumptions */}
          <div className="pt-3 border-t border-white/10 space-y-4">
            <div className="text-xs font-mono text-[#C6FF2E]">
              2. SOLAR & WIND GENERATION ASSUMPTIONS
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Solar Generation Assumption (MW)</span>
                <span className="text-[#C6FF2E] tabular-nums">
                  {solarDeltaMw >= 0 ? '+' : ''}
                  {solarDeltaMw.toLocaleString()} MW
                </span>
              </div>
              <input
                type="range"
                min={-5000}
                max={10000}
                step={250}
                value={solarDeltaMw}
                onChange={(e) => setSolarDeltaMw(parseInt(e.target.value, 10))}
                className="w-full accent-[#C6FF2E] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Wind Generation Assumption (MW)</span>
                <span className="text-[#C6FF2E] tabular-nums">
                  {windDeltaMw >= 0 ? '+' : ''}
                  {windDeltaMw.toLocaleString()} MW
                </span>
              </div>
              <input
                type="range"
                min={-5000}
                max={10000}
                step={250}
                value={windDeltaMw}
                onChange={(e) => setWindDeltaMw(parseInt(e.target.value, 10))}
                className="w-full accent-[#C6FF2E] cursor-pointer"
              />
            </div>
          </div>

          {/* Group 3: Battery Storage Assumptions */}
          <div className="pt-3 border-t border-white/10 space-y-4">
            <div className="text-xs font-mono text-amber-300">
              3. BATTERY STORAGE ASSUMPTIONS (SIMULATED)
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Battery Capacity (MWh)</span>
                <span className="text-[#F4F6FA] tabular-nums">
                  {batteryCapMwh.toLocaleString()} MWh
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20000}
                step={500}
                value={batteryCapMwh}
                onChange={(e) => setBatteryCapMwh(parseInt(e.target.value, 10))}
                className="w-full accent-[#3FD8FF] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A8B5C5]">Initial Battery SOC (%)</span>
                <span className="text-[#F4F6FA] tabular-nums">{batterySocPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={batterySocPct}
                onChange={(e) => setBatterySocPct(parseInt(e.target.value, 10))}
                className="w-full accent-[#3FD8FF] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#A8B5C5] mb-1">
                  Max Discharge (MW)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={200}
                  value={batteryMaxMw}
                  onChange={(e) => setBatteryMaxMw(Number(e.target.value))}
                  className="w-full bg-[#0D1524] border border-white/15 rounded px-2.5 py-1.5 text-xs font-mono text-[#F4F6FA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#A8B5C5] mb-1">
                  Round-Trip Eff. (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={batteryEffPct}
                  onChange={(e) => setBatteryEffPct(Number(e.target.value))}
                  className="w-full bg-[#0D1524] border border-white/15 rounded px-2.5 py-1.5 text-xs font-mono text-[#F4F6FA]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: DYNAMIC SCENARIO VISUALIZATION */}
        <div className="lg:col-span-8 space-y-6">
          {simResult && (
            <>
              {/* 4 Output Metrics: Baseline, Scenario Adjustment, Estimated Change, Net Peak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                  <div className="text-[11px] font-mono text-[#A8B5C5]">
                    RECORDED BASELINE MEAN
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#F4F6FA] mt-1.5 tabular-nums">
                    {simResult.summary.baseline_mean_demand_mw.toLocaleString()} MW
                  </div>
                  <div className="text-xs font-mono text-[#718096] mt-1">
                    Peak: {simResult.summary.baseline_peak_demand_mw.toLocaleString()} MW
                  </div>
                </div>

                <div className="bg-[#172235] border border-amber-400/40 rounded-lg p-4">
                  <div className="text-[11px] font-mono text-amber-400">
                    SCENARIO ADJUSTED MEAN
                  </div>
                  <div className="font-mono text-2xl font-bold text-amber-400 mt-1.5 tabular-nums">
                    {simResult.summary.scenario_mean_demand_mw.toLocaleString()} MW
                  </div>
                  <div className="text-xs font-mono text-[#A8B5C5] mt-1">
                    Peak: {simResult.summary.scenario_peak_demand_mw.toLocaleString()} MW
                  </div>
                </div>

                <div className="bg-[#172235] border border-white/12 rounded-lg p-4">
                  <div className="text-[11px] font-mono text-[#3FD8FF]">ESTIMATED CHANGE</div>
                  <div className="font-mono text-2xl font-bold text-[#3FD8FF] mt-1.5 tabular-nums">
                    {simResult.summary.mean_absolute_change_mw >= 0 ? '+' : ''}
                    {simResult.summary.mean_absolute_change_mw.toLocaleString()} MW
                  </div>
                  <div className="text-xs font-mono text-[#718096] mt-1 tabular-nums">
                    {simResult.summary.mean_percentage_change_pct >= 0 ? '+' : ''}
                    {simResult.summary.mean_percentage_change_pct}% vs baseline
                  </div>
                </div>

                <div className="bg-[#172235] border border-[#C6FF2E]/45 rounded-lg p-4">
                  <div className="text-[11px] font-mono text-[#C6FF2E]">
                    NET PEAK WITH RE + BESS
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#C6FF2E] mt-1.5 tabular-nums">
                    {simResult.summary.scenario_net_peak_after_hypothetical_mitigation_mw.toLocaleString()}{' '}
                    MW
                  </div>
                  <div className="text-xs font-mono text-[#A8B5C5] mt-1">
                    Hypothetical peak-shaved load
                  </div>
                </div>
              </div>

              {/* Primary Scenario Trajectory Comparison Chart */}
              <div className="bg-[#172235] border border-white/12 rounded-lg p-6 space-y-4">
                <div className="border-b border-white/12 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#3FD8FF]">
                      DYNAMIC SCENARIO TRAJECTORY · {windowId.replace('_', ' ')}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-1">
                      Baseline Demand vs. Scenario Adjustment vs. Mitigated Net Load (MW)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#C6FF2E]">HYPOTHETICAL SIMULATION</span>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={simResult.series}
                      margin={{ top: 10, right: 20, left: 15, bottom: 10 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        tickFormatter={(v: string) => v.slice(11)}
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
                          `${Number(val ?? 0).toLocaleString()} MW`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="baseline_demand_mw"
                        name="Recorded Baseline Demand (MW)"
                        stroke="#A8B5C5"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="simulated_demand_mw"
                        name="Scenario Adjusted Demand (MW)"
                        stroke="#F59E0B"
                        strokeWidth={2.3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="simulated_net_load_reference_mw"
                        name="Net Demand After Simulated RE + BESS (MW)"
                        stroke="#C6FF2E"
                        strokeWidth={2.3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Companion Simulated Battery State of Charge (SOC) & Assumption Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#172235] border border-white/12 rounded-lg p-5 space-y-3">
                  <div className="text-xs font-mono text-[#3FD8FF]">
                    SIMULATED BATTERY STORAGE STATE OF CHARGE (MWh)
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simResult.series}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fill: '#718096', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                          tickFormatter={(v: string) => v.slice(11)}
                        />
                        <YAxis
                          tick={{ fill: '#718096', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0D1524',
                            borderColor: 'rgba(255,255,255,0.18)',
                            fontFamily: 'IBM Plex Mono',
                            fontSize: '11px',
                          }}
                          formatter={(v) => [`${Number(v ?? 0).toLocaleString()} MWh`, 'Remaining SOC']}
                        />
                        <Area
                          type="monotone"
                          dataKey="simulated_battery_soc_remaining_mwh"
                          stroke="#3FD8FF"
                          fill="rgba(63, 216, 255, 0.2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#172235] border border-amber-400/40 rounded-lg p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-semibold text-amber-400">
                      WHY PHYSICAL GRID SURPLUS / DEFICIT IS NOT CALCULATED
                    </div>
                    <p className="text-xs text-[#F4F6FA]/90 leading-relaxed">
                      {simResult.supply_accounting_safeguard.reason}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0D1524] border border-white/10 rounded text-[11px] font-mono text-[#A8B5C5] space-y-1">
                    <div>
                      ACTIVE ASSUMPTIONS: Load {demandPct >= 0 ? '+' : ''}
                      {demandPct}% ({demandOffsetMw >= 0 ? '+' : ''}
                      {demandOffsetMw} MW)
                    </div>
                    <div>
                      RE Offset: Solar {solarDeltaMw} MW · Wind {windDeltaMw} MW
                    </div>
                    <div>
                      BESS: {batteryCapMwh} MWh @ {batterySocPct}% SOC ({batteryMaxMw} MW max,{' '}
                      {batteryEffPct}% eff)
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Scenarios Comparison Table */}
              {savedScenarios.length > 0 && (
                <div className="bg-[#172235] border border-white/12 rounded-lg p-6">
                  <div className="border-b border-white/12 pb-3 mb-4 flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#F4F6FA]">
                      Saved Scenarios Comparison Matrix ({savedScenarios.length})
                    </h3>
                    <button
                      onClick={() => setSavedScenarios([])}
                      className="text-xs font-mono text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/12 text-[#A8B5C5]">
                          <th className="py-2 pr-3">SCENARIO</th>
                          <th className="py-2 px-3">PERIOD</th>
                          <th className="py-2 px-3 text-right">LOAD ADJUSTMENT</th>
                          <th className="py-2 px-3 text-right">SCENARIO PEAK</th>
                          <th className="py-2 pl-3 text-right">NET PEAK (RE + BESS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {savedScenarios.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 pr-3 text-[#F4F6FA]">{item.name}</td>
                            <td className="py-2.5 px-3 text-[#3FD8FF]">{item.data.window_id}</td>
                            <td className="py-2.5 px-3 text-right text-[#A8B5C5] tabular-nums">
                              {item.data.assumptions.demand_adjustment_pct}% /{' '}
                              {item.data.assumptions.demand_offset_mw} MW
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-400 tabular-nums">
                              {item.data.summary.scenario_peak_demand_mw.toLocaleString()} MW
                            </td>
                            <td className="py-2.5 pl-3 text-right text-[#C6FF2E] tabular-nums">
                              {item.data.summary.scenario_net_peak_after_hypothetical_mitigation_mw.toLocaleString()}{' '}
                              MW
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTIONS 11, 12, 13: GRID RISK, RENEWABLE INTELLIGENCE & AI RECOMMENDATIONS
// ============================================================================

interface GridRiskViewProps {
  riskStatus: RiskStatusResponse | null;
  recommendations: RecommendationsResponse | null;
}

export const GridRiskView: React.FC<GridRiskViewProps> = ({ riskStatus, recommendations }) => {
  const [selectedDimensionId, setSelectedDimensionId] = useState<string>('demand_growth');
  const [topologyMode, setTopologyMode] = useState<'3d' | 'schematic'>('3d');

  if (!riskStatus) {
    return (
      <div className="p-8 bg-[#172235] border border-white/12 text-sm font-mono text-[#A8B5C5]">
        Loading Grid Risk Intelligence topology and renewable integration modules...
      </div>
    );
  }

  const selectedDim =
    riskStatus.dimensions.find((d) => d.id === selectedDimensionId) || riskStatus.dimensions[0];

  const badgeStyle = (level: 'Normal' | 'Watch' | 'Elevated' | 'Critical') => {
    switch (level) {
      case 'Normal':
        return 'text-[#C6FF2E] border-[#C6FF2E]/40 bg-[#C6FF2E]/10';
      case 'Watch':
        return 'text-[#3FD8FF] border-[#3FD8FF]/40 bg-[#3FD8FF]/10';
      case 'Elevated':
        return 'text-amber-400 border-amber-400/40 bg-amber-400/10';
      case 'Critical':
        return 'text-red-400 border-red-400/40 bg-red-400/10';
    }
  };

  return (
    <div className="space-y-12">
      {/* MANDATORY LIMITED DATA MODE BANNER */}
      <div className="bg-amber-950/35 border border-amber-400/50 p-6 lg:p-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{riskStatus.operational_mode}</span>
          </div>
          <span className="text-xs font-mono text-[#F4F6FA] bg-[#0D1524] border border-white/15 px-3.5 py-1.5">
            OVERALL CLASSIFICATION: {riskStatus.overall_classification.toUpperCase()}
          </span>
        </div>
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F4F6FA]">
          Why GridSense Operates in Limited Data Mode for Supply-Demand Imbalance
        </h2>
        <p className="text-sm lg:text-base text-[#F4F6FA]/90 leading-relaxed">
          {riskStatus.limited_mode_explanation}
        </p>
      </div>

      {/* INTERACTIVE 3D WEBGL DIGITAL TWIN STAGE FOR GRID RISK & TOPOLOGY */}
      <div className="border border-white/12 bg-[#172235]">
        <div className="px-6 py-4 border-b border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#3FD8FF]">
              SPATIAL INFRASTRUCTURE TWIN · WEBGL 3D & LOGICAL SCHEMATIC
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-0.5">
              3D Smart Grid Digital Twin & 6-Dimension Stress Inspector
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setTopologyMode('3d')}
              className={`px-3.5 py-1.5 border transition-colors cursor-pointer ${
                topologyMode === '3d'
                  ? 'bg-[#C6FF2E] text-[#0D1524] border-[#C6FF2E] font-semibold'
                  : 'bg-[#0D1524] text-[#A8B5C5] border-white/15 hover:text-[#F4F6FA]'
              }`}
            >
              3D Isometric Twin
            </button>
            <button
              onClick={() => setTopologyMode('schematic')}
              className={`px-3.5 py-1.5 border transition-colors cursor-pointer ${
                topologyMode === 'schematic'
                  ? 'bg-[#3FD8FF] text-[#0D1524] border-[#3FD8FF] font-semibold'
                  : 'bg-[#0D1524] text-[#A8B5C5] border-white/15 hover:text-[#F4F6FA]'
              }`}
            >
              2D Logical Schematic
            </button>
          </div>
        </div>

        {topologyMode === '3d' && (
          <SmartGrid3DScene heightClass="h-[460px]" compactHud />
        )}
      </div>

      {/* SECTION 11: ILLUSTRATIVE GRID TOPOLOGY VISUALIZATION + 6 RISK DIMENSIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Rich Illustrative Topology Visualization */}
        <div className="lg:col-span-7 bg-[#172235] border border-white/12 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-white/12 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-mono text-[#3FD8FF]">
                ILLUSTRATIVE SMART-GRID TOPOLOGY · NOT LIVE GEOGRAPHIC TELEMETRY
              </div>
              <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-0.5">
                Interactive Grid Intelligence Network
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#C6FF2E]">CLICK ANY NODE TO INSPECT</span>
          </div>

          <div className="bg-[#0D1524] border border-white/10 p-4 my-auto">
            <svg viewBox="0 0 760 400" className="w-full h-auto">
              {/* Background grid */}
              <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
                <line x1="0" y1="100" x2="760" y2="100" />
                <line x1="0" y1="200" x2="760" y2="200" />
                <line x1="0" y1="300" x2="760" y2="300" />
                <line x1="190" y1="0" x2="190" y2="400" />
                <line x1="380" y1="0" x2="380" y2="400" />
                <line x1="570" y1="0" x2="570" y2="400" />
              </g>

              {/* Transmission Links (Cyan Connections) */}
              <g fill="none">
                <path
                  d="M 140 90 L 380 200 M 620 90 L 380 200 M 140 310 L 380 200 M 620 310 L 380 200 M 380 55 L 380 200 M 380 345 L 380 200"
                  stroke="#3FD8FF"
                  strokeOpacity="0.28"
                  strokeWidth="2.5"
                />
                <path
                  d="M 140 90 L 380 200 M 620 90 L 380 200 M 140 310 L 380 200 M 620 310 L 380 200 M 380 55 L 380 200 M 380 345 L 380 200"
                  stroke="#3FD8FF"
                  strokeWidth="2"
                  strokeDasharray="8 10"
                  className="animate-energy-flow"
                />
              </g>

              {/* Central Node: Intelligence Hub */}
              <g
                onClick={() => setSelectedDimensionId('demand_growth')}
                className="cursor-pointer"
              >
                <circle
                  cx="380"
                  cy="200"
                  r="48"
                  fill="#172235"
                  stroke="#C6FF2E"
                  strokeWidth="2.5"
                />
                <circle cx="380" cy="166" r="4" fill="#C6FF2E" />
                <text
                  x="380"
                  y="196"
                  textAnchor="middle"
                  fill="#F4F6FA"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="IBM Plex Mono"
                >
                  INTELLIGENCE HUB
                </text>
                <text
                  x="380"
                  y="212"
                  textAnchor="middle"
                  fill="#C6FF2E"
                  fontSize="9.5"
                  fontFamily="IBM Plex Mono"
                >
                  +4h Residual HGB
                </text>
              </g>

              {/* Top-Left: Demand Nodes */}
              <g
                onClick={() => setSelectedDimensionId('demand_growth')}
                className="cursor-pointer"
              >
                <rect
                  x="45"
                  y="55"
                  width="185"
                  height="68"
                  rx="6"
                  fill="#172235"
                  stroke={selectedDimensionId === 'demand_growth' ? '#C6FF2E' : '#3FD8FF'}
                  strokeWidth="1.8"
                />
                <circle cx="62" cy="74" r="4" fill="#C6FF2E" />
                <text x="74" y="78" fill="#F4F6FA" fontSize="11" fontFamily="IBM Plex Mono">
                  DEMAND NODES
                </text>
                <text x="62" y="96" fill="#3FD8FF" fontSize="10" fontFamily="IBM Plex Mono">
                  demand_met_mw (Verified)
                </text>
                <text x="62" y="112" fill="#F59E0B" fontSize="9.5" fontFamily="IBM Plex Mono">
                  Status: ELEVATED
                </text>
              </g>

              {/* Top-Right: Forecast Error & Q3 Bias Node */}
              <g
                onClick={() => setSelectedDimensionId('forecast_error')}
                className="cursor-pointer"
              >
                <rect
                  x="530"
                  y="55"
                  width="185"
                  height="68"
                  rx="6"
                  fill="#172235"
                  stroke={selectedDimensionId === 'forecast_error' ? '#C6FF2E' : '#F59E0B'}
                  strokeWidth="1.8"
                />
                <circle cx="547" cy="74" r="4" fill="#F59E0B" />
                <text x="559" y="78" fill="#F4F6FA" fontSize="11" fontFamily="IBM Plex Mono">
                  FORECAST BIAS GUARD
                </text>
                <text x="547" y="96" fill="#A8B5C5" fontSize="10" fontFamily="IBM Plex Mono">
                  2026 Q3: -1,142.8 MW
                </text>
                <text x="547" y="112" fill="#F59E0B" fontSize="9.5" fontFamily="IBM Plex Mono">
                  Status: ELEVATED
                </text>
              </g>

              {/* Top-Center: Generation Hubs */}
              <g
                onClick={() => setSelectedDimensionId('generation_availability')}
                className="cursor-pointer"
              >
                <rect
                  x="285"
                  y="12"
                  width="190"
                  height="56"
                  rx="6"
                  fill="#172235"
                  stroke={
                    selectedDimensionId === 'generation_availability' ? '#C6FF2E' : '#3FD8FF'
                  }
                  strokeWidth="1.5"
                />
                <text x="300" y="34" fill="#F4F6FA" fontSize="10.5" fontFamily="IBM Plex Mono">
                  GENERATION HUBS
                </text>
                <text x="300" y="52" fill="#3FD8FF" fontSize="9.5" fontFamily="IBM Plex Mono">
                  WATCH · Scheduled Proxy Only
                </text>
              </g>

              {/* Bottom-Left: Renewable Nodes */}
              <g
                onClick={() => setSelectedDimensionId('renewable_intermittency')}
                className="cursor-pointer"
              >
                <rect
                  x="45"
                  y="275"
                  width="185"
                  height="68"
                  rx="6"
                  fill="#172235"
                  stroke={
                    selectedDimensionId === 'renewable_intermittency' ? '#C6FF2E' : '#3FD8FF'
                  }
                  strokeWidth="1.8"
                />
                <circle cx="62" cy="294" r="4" fill="#3FD8FF" />
                <text x="74" y="298" fill="#F4F6FA" fontSize="11" fontFamily="IBM Plex Mono">
                  RENEWABLE NODES
                </text>
                <text x="62" y="316" fill="#A8B5C5" fontSize="10" fontFamily="IBM Plex Mono">
                  Solar & Wind Corridors
                </text>
                <text x="62" y="332" fill="#3FD8FF" fontSize="9.5" fontFamily="IBM Plex Mono">
                  Status: WATCH (Sim Mode)
                </text>
              </g>

              {/* Bottom-Right: Battery & Transmission Links */}
              <g
                onClick={() => setSelectedDimensionId('battery_transmission')}
                className="cursor-pointer"
              >
                <rect
                  x="530"
                  y="275"
                  width="185"
                  height="68"
                  rx="6"
                  fill="#172235"
                  stroke={selectedDimensionId === 'battery_transmission' ? '#C6FF2E' : '#3FD8FF'}
                  strokeWidth="1.8"
                />
                <circle cx="547" cy="294" r="4" fill="#C6FF2E" />
                <text x="559" y="298" fill="#F4F6FA" fontSize="11" fontFamily="IBM Plex Mono">
                  BATTERY & LINKS
                </text>
                <text x="547" y="316" fill="#A8B5C5" fontSize="10" fontFamily="IBM Plex Mono">
                  BESS & Transmission Corridors
                </text>
                <text x="547" y="332" fill="#C6FF2E" fontSize="9.5" fontFamily="IBM Plex Mono">
                  Status: NORMAL (Sandbox)
                </text>
              </g>

              {/* Bottom-Center: Data Watermark Node */}
              <g
                onClick={() => setSelectedDimensionId('data_quality')}
                className="cursor-pointer"
              >
                <rect
                  x="285"
                  y="330"
                  width="190"
                  height="56"
                  rx="6"
                  fill="#172235"
                  stroke={selectedDimensionId === 'data_quality' ? '#C6FF2E' : '#3FD8FF'}
                  strokeWidth="1.5"
                />
                <text x="300" y="352" fill="#F4F6FA" fontSize="10.5" fontFamily="IBM Plex Mono">
                  DATA TELEMETRY GATE
                </text>
                <text x="300" y="370" fill="#3FD8FF" fontSize="9.5" fontFamily="IBM Plex Mono">
                  WATCH · Watermark 2026-09-29
                </text>
              </g>
            </svg>
          </div>

          <div className="text-xs font-mono text-[#718096]">
            Note: This topology is an illustrative architectural schematic showing how GridSense AI
            connects its 6 risk dimensions. It does not represent geographic transmission coordinates.
          </div>
        </div>

        {/* Right: Selected Risk Dimension Evidence Inspector */}
        <div className="lg:col-span-5 bg-[#172235] border border-white/12 rounded-lg p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/12 pb-3">
              <div>
                <div className="text-xs font-mono text-[#3FD8FF]">{selectedDim.data_mode}</div>
                <h3 className="font-display text-xl font-bold text-[#F4F6FA] mt-0.5">
                  {selectedDim.name}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded border text-xs font-mono font-semibold ${badgeStyle(
                  selectedDim.classification
                )}`}
              >
                {selectedDim.classification.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded bg-[#0D1524] border border-white/10">
                <div className="font-mono text-[11px] text-[#C6FF2E] mb-1">
                  1. MEASURED EVIDENCE
                </div>
                <div className="font-mono text-[#F4F6FA]">{selectedDim.measured_value}</div>
              </div>

              <div className="p-3.5 rounded bg-[#0D1524] border border-white/10">
                <div className="font-mono text-[11px] text-[#3FD8FF] mb-1">
                  2. MODEL / SCENARIO ESTIMATE
                </div>
                <div className="font-mono text-[#F4F6FA]">{selectedDim.estimated_value}</div>
              </div>

              <div className="p-3.5 rounded bg-[#0D1524] border border-white/10">
                <div className="font-mono text-[11px] text-[#A8B5C5] mb-1">
                  3. ASSUMPTIONS APPLIED
                </div>
                <div className="text-[#A8B5C5] leading-relaxed">{selectedDim.assumptions_used}</div>
              </div>

              <div className="p-3.5 rounded bg-amber-950/30 border border-amber-400/35">
                <div className="font-mono text-[11px] text-amber-400 mb-1">
                  4. MISSING REAL-WORLD TELEMETRY
                </div>
                <div className="text-amber-100 leading-relaxed">{selectedDim.missing_data}</div>
              </div>

              <div className="p-3.5 rounded bg-[#0D1524] border border-white/10">
                <div className="font-mono text-[11px] text-[#A8B5C5] mb-1">
                  5. CLASSIFICATION RULE RATIONALE
                </div>
                <div className="text-[#F4F6FA] leading-relaxed">
                  {selectedDim.classification_rationale}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All 6 Risk Dimension Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riskStatus.dimensions.map((dim) => {
          const active = dim.id === selectedDim.id;
          return (
            <button
              key={dim.id}
              onClick={() => setSelectedDimensionId(dim.id)}
              className={`text-left p-5 rounded-lg border transition-all cursor-pointer ${
                active
                  ? 'bg-[#202D40] border-[#3FD8FF]'
                  : 'bg-[#172235] border-white/12 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[11px] text-[#3FD8FF]">{dim.data_mode}</span>
                <span
                  className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-semibold ${badgeStyle(
                    dim.classification
                  )}`}
                >
                  {dim.classification}
                </span>
              </div>
              <div className="font-display text-base font-bold text-[#F4F6FA]">{dim.name}</div>
              <p className="text-xs text-[#A8B5C5] mt-1.5 leading-relaxed">
                {dim.classification_rationale}
              </p>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 12: RENEWABLE ENERGY INTELLIGENCE MODULE
      ===================================================================== */}
      <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/12 pb-5">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#3FD8FF]">
              RENEWABLE ENERGY INTELLIGENCE · SOLAR, WIND & WEATHER CAUSALITY
            </div>
            <h3 className="font-display text-2xl font-bold text-[#F4F6FA]">
              Managing Solar Duck-Curve Ramps & Preventing Future-Weather Leakage
            </h3>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-[#0D1524] border border-amber-400/35 px-3.5 py-2 rounded">
            EXTERNAL RE FEEDS: UNCONNECTED (ILLUSTRATIVE REGIME PROFILE)
          </span>
        </div>

        {/* Visual Cards + Illustrative Diurnal Renewable Variability Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Visual Solar/Wind & Storage Showcase Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="relative h-52 rounded-lg overflow-hidden border border-white/12 bg-[#0D1524]">
              <img
                src="/src/assets/images/renewable_solar_wind_corridor_1794041476824.jpg"
                alt="Hybrid utility solar array and wind turbine corridor"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1524] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-xs">
                <div className="font-mono text-[#C6FF2E] font-semibold">
                  SOLAR & WIND GENERATION CORRIDOR
                </div>
                <p className="text-[#F4F6FA] mt-0.5">
                  Midday solar relieves net grid demand between 10:00 and 15:00 IST, followed by a
                  steep evening net-load ramp as solar drops to zero.
                </p>
              </div>
            </div>

            <div className="relative h-52 rounded-lg overflow-hidden border border-white/12 bg-[#0D1524]">
              <img
                src="/src/assets/images/battery_storage_substation_1794041477807.jpg"
                alt="Utility battery energy storage substation"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1524] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-xs">
                <div className="font-mono text-[#3FD8FF] font-semibold">
                  UTILITY BESS DISPATCH COORDINATION
                </div>
                <p className="text-[#F4F6FA] mt-0.5">
                  Charges during peak midday solar availability and dispatches during the 18:00–22:00
                  IST evening ramp (modeled in Scenario Explorer).
                </p>
              </div>
            </div>
          </div>

          {/* Right: Illustrative Diurnal Renewable Variability & Net Load Chart */}
          <div className="lg:col-span-7 bg-[#0D1524] border border-white/12 rounded-lg p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <div className="text-xs font-mono text-[#C6FF2E]">
                  ILLUSTRATIVE DIURNAL RENEWABLE & NET-LOAD PROFILE (CONCEPTUAL PLACEHOLDER)
                </div>
                <h4 className="font-display text-base font-bold text-[#F4F6FA] mt-0.5">
                  Why Midday Solar Relief Creates the Evening Net-Load Ramp
                </h4>
              </div>
            </div>

            <div className="h-[260px] w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ILLUSTRATIVE_RENEWABLE_VARIABILITY_PROFILE}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                  />
                  <YAxis
                    tick={{ fill: '#A8B5C5', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1524',
                      borderColor: 'rgba(255,255,255,0.18)',
                      fontFamily: 'IBM Plex Mono',
                      fontSize: '11px',
                    }}
                    formatter={(v, name) => [
                      `${Number(v ?? 0).toLocaleString()} MW (Illustrative)`,
                      String(name ?? ''),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="gross_demand_mw"
                    name="Illustrative Gross Demand"
                    stroke="#3FD8FF"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="net_load_mw"
                    name="Illustrative Net Load (After Solar/Wind)"
                    stroke="#C6FF2E"
                    strokeWidth={2.2}
                  />
                  <Line
                    type="monotone"
                    dataKey="solar_mw"
                    name="Illustrative Solar Output"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs font-mono text-[#718096]">
              Transparency Note: Because the 164-column demand snapshot does not include verified
              national solar/wind telemetry, this chart is explicitly labelled as an illustrative
              regime profile.
            </div>
          </div>
        </div>

        {/* Strict Weather Causality & Unconnected External Sources Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#0D1524] border border-red-500/35 rounded-lg p-5 space-y-2">
            <div className="text-xs font-mono text-red-400 font-semibold">
              FORBIDDEN: FUTURE-OBSERVED WEATHER LEAKAGE
            </div>
            <h4 className="font-display text-base font-bold text-[#F4F6FA]">
              Never Use Observed Weather at (t + 4h)
            </h4>
            <p className="text-xs text-[#A8B5C5] leading-relaxed">
              Feeding historical observed temperature or solar irradiance from target time{' '}
              <code className="text-[#F4F6FA]">t + 4h</code> into a forecast issued at{' '}
              <code className="text-[#F4F6FA]">t</code> is data leakage — because an operator at
              time <code className="text-[#F4F6FA]">t</code> cannot know exact future weather.
            </p>
          </div>

          <div className="bg-[#0D1524] border border-[#C6FF2E]/40 rounded-lg p-5 space-y-2">
            <div className="text-xs font-mono text-[#C6FF2E] font-semibold">
              REQUIRED: ISSUE-TIME NWP FORECAST VINTAGES
            </div>
            <h4 className="font-display text-base font-bold text-[#F4F6FA]">
              Only Use Forecasts Available at Issue Time (t)
            </h4>
            <p className="text-xs text-[#A8B5C5] leading-relaxed">
              Valid exogenous weather integration requires archived Numerical Weather Prediction
              (NWP) forecasts that were actually issued at or before timestamp{' '}
              <code className="text-[#F4F6FA]">t</code>.
            </p>
          </div>

          <div className="bg-[#0D1524] border border-white/12 rounded-lg p-5 space-y-2">
            <div className="text-xs font-mono text-[#3FD8FF] font-semibold">
              UNCONNECTED EXTERNAL DATA SOURCES
            </div>
            <h4 className="font-display text-base font-bold text-[#F4F6FA]">
              Future Integration Connectors
            </h4>
            <ul className="text-xs font-mono text-[#A8B5C5] space-y-1 pt-1">
              <li>· NASA POWER Solar/Meteorological Archive (Not Connected)</li>
              <li>· CEA Daily Renewable Generation Reports (Not Connected)</li>
              <li>· NLDC REMC Live Wind/Solar Telemetry (Not Connected)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 13: AI RECOMMENDATIONS — DECISION-SUPPORT INSIGHTS
      ===================================================================== */}
      {recommendations && (
        <div className="bg-[#172235] border border-white/12 rounded-lg p-6 lg:p-8 space-y-6">
          <div className="border-b border-white/12 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#C6FF2E]">
                DECISION-SUPPORT INSIGHTS · EXPLAINABLE RECOMMENDATION ENGINE
              </div>
              <h3 className="font-display text-2xl font-bold text-[#F4F6FA] mt-1">
                Evidence-Backed Operational Recommendations
              </h3>
            </div>
            <div className="text-xs font-mono text-[#A8B5C5] bg-[#0D1524] border border-white/12 px-3.5 py-2 rounded">
              {recommendations.physical_dispatch_disclaimer}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.recommendations.map((rec, idx) => (
              <div
                key={rec.id}
                className="bg-[#0D1524] border border-white/12 rounded-lg p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#C6FF2E] font-semibold">
                      EVIDENCE-BACKED RECOMMENDATION 0{idx + 1}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-semibold ${badgeStyle(
                        rec.severity
                      )}`}
                    >
                      {rec.severity.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-display text-lg font-bold text-[#F4F6FA]">{rec.title}</h4>

                  <div className="space-y-2 text-xs leading-relaxed">
                    <div className="p-3 rounded bg-[#172235] border border-white/8">
                      <span className="font-mono text-[#3FD8FF] block mb-0.5">
                        WHAT WAS OBSERVED & WHY IT MATTERS:
                      </span>
                      <span className="text-[#A8B5C5]">{rec.reason}</span>
                    </div>

                    <div className="p-3 rounded bg-[#172235] border border-white/8">
                      <span className="font-mono text-[#C6FF2E] block mb-0.5">
                        SUPPORTING EVIDENCE:
                      </span>
                      <span className="font-mono text-[#F4F6FA]">{rec.supporting_metric}</span>
                    </div>

                    <div className="p-3 rounded bg-[#172235] border border-[#3FD8FF]/30">
                      <span className="font-mono text-[#3FD8FF] block mb-0.5">
                        SUGGESTED NEXT STEP:
                      </span>
                      <span className="text-[#F4F6FA]">{rec.suggested_action}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] font-mono text-[#718096]">
                  Basis: {rec.confidence_qualification}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
