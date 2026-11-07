import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { DashboardTabId } from '../types/gridsense';
import { SmartGrid3DScene } from './three/SmartGrid3DScene';
import hubCoreImg from '../assets/images/grid_hub_control_core_1794041478133.jpg';
import renewableCorridorImg from '../assets/images/renewable_solar_wind_corridor_1794041476824.jpg';
import batterySubstationImg from '../assets/images/battery_storage_substation_1794041477807.jpg';

interface LandingExperienceProps {
  onLaunchDashboard: (initialTab?: DashboardTabId) => void;
  onStartDemoMode: () => void;
}

// ============================================================================
// NORVA ISOMETRIC NIGHT-CITY GLIDE MEDIA ASSETS
// ============================================================================
const NORVA_DESKTOP_MP4 =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/65fdef53-5686-4659-8761-52d61bf1a4f7.mp4';
const NORVA_MOBILE_MP4 =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/9a30e5e9-9f03-4755-9bc1-7bcf1510aab3.mp4';
const NORVA_POSTER_JPG =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/33150b94-09f7-47da-a7c9-3ae76c2dd7eb.jpg';

interface ProcessStep {
  num: string;
  title: string;
  body: string;
  actionLabel: string;
  targetTab: DashboardTabId;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    num: '01',
    title: 'Authentic SCADA Ingestion, Locked',
    body: '64,860 verified 15-minute national demand observations (demand_met_mw) locked via SHA-256 through the 2026-09-29 23:45 IST watermark. Scheduled generation (total_gen_mw) is strictly isolated from metered physical supply.',
    actionLabel: 'Inspect Provenance Ledger →',
    targetTab: 'data-health',
  },
  {
    num: '02',
    title: 'Four-Hour Residual HGB Inference',
    body: 'Every 15 minutes, 9 causal historical lags and cyclical clocks pass through our frozen Residual HistGradientBoosting engine with source-hour shrinkage (α = 0.91–0.96), cutting MAE by 42.0% vs Seasonal Naive.',
    actionLabel: 'Open 4h Forecast Engine →',
    targetTab: 'forecast',
  },
  {
    num: '03',
    title: 'Chronological Regime & Bias Audit',
    body: 'Evaluated across 17,472 out-of-sample intervals in 2025 Q3, 2026 Q1, and 2026 Q3 (pooled R² = 0.965), transparently exposing the -1,142.8 MW underforecast bias during the 2026 Q3 monsoon humidity surge.',
    actionLabel: 'Review Rolling-Origin Report →',
    targetTab: 'performance',
  },
  {
    num: '04',
    title: 'Counterfactual Dispatch & Risk Hub',
    body: 'As cyan transmission corridors converge on the central intelligence hub, operators simulate demand shocks, solar/wind variability, and BESS peak-shaving under explicit Limited Data Mode guardrails.',
    actionLabel: 'Launch Scenario Laboratory →',
    targetTab: 'scenario',
  },
];

const GRID_HOTSPOTS = [
  {
    left: '22%',
    top: '44%',
    label: '400kV Substation Load',
    value: 'demand_met_mw · 15m SCADA',
    tab: 'data-health' as DashboardTabId,
  },
  {
    left: '48%',
    top: '30%',
    label: 'Wind & Solar Corridor',
    value: 'α = 0.91–0.96 Shrinkage',
    tab: 'grid-risk' as DashboardTabId,
  },
  {
    left: '64%',
    top: '52%',
    label: 'Central Forecast Hub',
    value: '3,150.4 MW MAE (-42.0%)',
    tab: 'forecast' as DashboardTabId,
  },
  {
    left: '76%',
    top: '34%',
    label: '2026 Q3 Monsoon Guard',
    value: '-1,142.8 MW Bias Alert',
    tab: 'performance' as DashboardTabId,
  },
];

const HUB_MODULES: Array<{ idx: string; label: string; tab: DashboardTabId }> = [
  { idx: '01', label: 'National Grid Telemetry Overview', tab: 'overview' },
  { idx: '02', label: '4-Hour Residual HGB Forecast Engine', tab: 'forecast' },
  { idx: '03', label: 'Rolling-Origin & Q3 Bias Benchmark', tab: 'performance' },
  { idx: '04', label: 'SHA-256 SCADA Provenance & Audit', tab: 'data-health' },
  { idx: '05', label: 'Counterfactual BESS & Risk Sandbox', tab: 'scenario' },
];

function clamp(v: number, min = 0, max = 1): number {
  return v < min ? min : v > max ? max : v;
}

function seg(p: number, a: number, b: number): number {
  return clamp((p - a) / (b - a), 0, 1);
}

function easeInOutQuad(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const LandingExperience: React.FC<LandingExperienceProps> = ({
  onLaunchDashboard,
  onStartDemoMode,
}) => {
  const [loaderHidden, setLoaderHidden] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [manualStepOverride, setManualStepOverride] = useState<number | null>(null);
  const [openHotspotIndex, setOpenHotspotIndex] = useState<number | null>(2);

  // Refs for scroll-scrubbed NORVA video + MOSSLINE overlays
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const scrollCueRef = useRef<HTMLDivElement | null>(null);
  const scrollCueFillRef = useRef<HTMLDivElement | null>(null);
  const processBoxRef = useRef<HTMLDivElement | null>(null);
  const hubPanelRef = useRef<HTMLDivElement | null>(null);
  const glassBigNumRef = useRef<HTMLSpanElement | null>(null);
  const sparkPathRef = useRef<SVGPolylineElement | null>(null);
  const hotspotRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Solutions section & count-up refs
  const solRef = useRef<HTMLElement | null>(null);
  const twinSectionRef = useRef<HTMLElement | null>(null);
  const statRefs = useRef<Array<HTMLDivElement | null>>([]);
  const manualStepRef = useRef<number | null>(null);

  useEffect(() => {
    manualStepRef.current = manualStepOverride;
  }, [manualStepOverride]);

  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    const video = videoRef.current;
    if (!track || !scene || !video) return;

    let disposed = false;

    // Responsive video source selection (<= 900px uses 1280x720 clip)
    const desiredSrc = window.innerWidth <= 900 ? NORVA_MOBILE_MP4 : NORVA_DESKTOP_MP4;
    if (video.src !== desiredSrc) {
      video.src = desiredSrc;
      video.load();
    }

    // Loader fade-out: 350ms after clip's first frame loads, or 3.5s max
    const maxTimer = window.setTimeout(() => {
      if (!disposed) setLoaderHidden(true);
    }, 3500);

    const onLoadedData = () => {
      window.setTimeout(() => {
        if (!disposed) setLoaderHidden(true);
      }, 350);
    };

    if (video.readyState >= 2) {
      onLoadedData();
    } else {
      video.addEventListener('loadeddata', onLoadedData, { once: true });
    }

    // Measure SVG sparkline length
    let sparkLen = 250;
    if (sparkPathRef.current) {
      try {
        sparkLen = sparkPathRef.current.getTotalLength() || 250;
        sparkPathRef.current.style.strokeDasharray = `${sparkLen}`;
        sparkPathRef.current.style.strokeDashoffset = `${sparkLen}`;
      } catch {
        sparkLen = 250;
      }
    }

    // Video seeking state
    let curTime = 0;
    let targetTime = 0;

    const trySeekVideo = () => {
      if (disposed || !video.duration || Number.isNaN(video.duration)) return;
      if (!video.seeking && Math.abs(targetTime - video.currentTime) > 1 / 60) {
        try {
          video.currentTime = clamp(targetTime, 0, Math.max(0, video.duration - 1 / 48));
        } catch {
          // Ignore early seek exceptions
        }
      }
    };

    const onVideoSeeked = () => {
      if (!disposed && Math.abs(targetTime - video.currentTime) > 1 / 60) {
        trySeekVideo();
      }
    };
    video.addEventListener('seeked', onVideoSeeked);

    // Solutions stats count-up state
    let statsStarted = false;
    let statsStartTime = 0;
    let lastAutoStep = 0;
    let rafId = 0;

    const tick = (now: number) => {
      if (disposed) return;

      // 1. Scroll progress p in [0, 1] across the 320vh track + explicit viewport pin
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalScroll = Math.max(1, track.offsetHeight - vh);
      const p = clamp(-rect.top / totalScroll, 0, 1);

      if (rect.top <= 0 && rect.bottom >= vh) {
        scene.style.position = 'fixed';
        scene.style.top = '0px';
        scene.style.bottom = 'auto';
      } else if (rect.bottom < vh) {
        scene.style.position = 'absolute';
        scene.style.top = 'auto';
        scene.style.bottom = '0px';
      } else {
        scene.style.position = 'absolute';
        scene.style.top = '0px';
        scene.style.bottom = 'auto';
      }

      // 2. Smooth video scrubbing: target = p * (duration - 1/48), cur += (target - cur) * 0.2
      const dur = video.duration && Number.isFinite(video.duration) ? video.duration : 5.04;
      const maxDur = Math.max(0.1, dur - 1 / 48);
      const rawTarget = p * maxDur;
      curTime += (rawTarget - curTime) * 0.2;
      targetTime = curTime;
      trySeekVideo();

      // 3. Headline block 3D tilt-back into the isometric ground:
      // h = easeInOutQuad(p / .38), translateY(-34h vh) rotateX(62h deg) scale(1 - .12h)
      // Opacity falls from 1 to 0 between p .10 and .24
      const h = easeInOutQuad(p / 0.38);
      const heroOp = 1 - seg(p, 0.1, 0.24);
      if (heroCopyRef.current) {
        heroCopyRef.current.style.transform = `translateY(${-34 * h}vh) rotateX(${62 * h}deg) scale(${1 - 0.12 * h})`;
        heroCopyRef.current.style.opacity = `${heroOp}`;
        heroCopyRef.current.style.visibility = heroOp <= 0.005 ? 'hidden' : 'visible';
      }

      // 4. Scroll cue: underline drains over first 10%, cue fades out between p .04 and .12
      const drain = 1 - seg(p, 0, 0.1);
      const cueOp = 1 - seg(p, 0.04, 0.12);
      if (scrollCueFillRef.current) {
        scrollCueFillRef.current.style.transform = `scaleX(${drain})`;
      }
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = `${cueOp}`;
        scrollCueRef.current.style.visibility = cueOp <= 0.005 ? 'hidden' : 'visible';
      }

      // 5. Bottom-left 4-step process list: rises 40px and fades in between p .08 and .24
      const procIn = easeInOutQuad(seg(p, 0.08, 0.24));
      if (processBoxRef.current) {
        processBoxRef.current.style.opacity = `${procIn}`;
        processBoxRef.current.style.transform = `translate3d(0, ${(1 - procIn) * 40}px, 0)`;
        processBoxRef.current.style.visibility = procIn <= 0.005 ? 'hidden' : 'visible';
      }

      // Determine active step from scroll p (01 -> 02 -> 03 -> 04) unless manually clicked
      if (manualStepRef.current === null) {
        const computedStep = p < 0.36 ? 0 : p < 0.62 ? 1 : p < 0.82 ? 2 : 3;
        if (computedStep !== lastAutoStep) {
          lastAutoStep = computedStep;
          setActiveStepIndex(computedStep);
        }
      }

      // 6. Mossline Floating Lime Hotspots over the isometric grid (p .22 -> .96)
      hotspotRefs.current.forEach((hsEl, i) => {
        if (!hsEl) return;
        const hsIn = easeInOutCubic(seg(p, 0.22 + i * 0.05, 0.32 + i * 0.05));
        hsEl.style.opacity = `${hsIn}`;
        hsEl.style.transform = `scale(${0.65 + 0.35 * hsIn})`;
        hsEl.style.visibility = hsIn <= 0.01 ? 'hidden' : 'visible';
      });

      // 7. Right-side Frosted Glass Telemetry Card & Sparkline (rises in as camera nears Hub)
      const hubIn = easeInOutCubic(seg(p, 0.3, 0.48));
      if (hubPanelRef.current) {
        hubPanelRef.current.style.opacity = `${hubIn}`;
        hubPanelRef.current.style.transform = `translate3d(0, ${(1 - hubIn) * 44}px, 0)`;
        hubPanelRef.current.style.visibility = hubIn <= 0.01 ? 'hidden' : 'visible';
      }
      if (glassBigNumRef.current) {
        const countPct = (42.0 * seg(p, 0.34, 0.78)).toFixed(1);
        glassBigNumRef.current.textContent = `-${countPct}%`;
      }
      if (sparkPathRef.current) {
        const spk = seg(p, 0.36, 0.82);
        sparkPathRef.current.style.strokeDashoffset = `${sparkLen * (1 - spk)}`;
      }

      // 8. Solutions section (#sol) 4-stat count-up when top passes 65% of viewport height
      if (solRef.current) {
        const solTop = solRef.current.getBoundingClientRect().top;
        if (!statsStarted && solTop <= window.innerHeight * 0.65) {
          statsStarted = true;
          statsStartTime = now;
        }
      }
      if (statsStarted) {
        const st = clamp((now - statsStartTime) / 1600, 0, 1);
        const se = easeInOutCubic(st);
        const el0 = statRefs.current[0];
        const el1 = statRefs.current[1];
        const el2 = statRefs.current[2];
        const el3 = statRefs.current[3];
        if (el0) el0.textContent = Math.round(64860 * se).toLocaleString('en-US');
        if (el1) el1.textContent = `-${(42.0 * se).toFixed(1)}%`;
        if (el2) el2.textContent = (0.965 * se).toFixed(3);
        if (el3) el3.textContent = Math.round(17472 * se).toLocaleString('en-US');
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.clearTimeout(maxTimer);
      cancelAnimationFrame(rafId);
      video.removeEventListener('seeked', onVideoSeeked);
    };
  }, []);

  // Mossline 3D card tilt handlers
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

  const displayedStep = manualStepOverride !== null ? manualStepOverride : activeStepIndex;

  return (
    <div className="gs-blend-root">
      {/* =====================================================================
          1. NORVA FULL-SCREEN NIGHT LOADER (Dotted Ellipses + 6 Cyan Squares + Lime Chevron)
          ===================================================================== */}
      <div className={`nv-loader ${loaderHidden ? 'is-hidden' : ''}`} aria-hidden={loaderHidden}>
        <div className="nv-loader-stage">
          <div className="nv-ellipse-wide" />
          <div className="nv-ellipse-circle" />
          <svg className="nv-mark" viewBox="0 0 56 56" fill="none">
            {/* 6 Cyan Squares in a Ring */}
            <rect x="25" y="4" width="6" height="6" rx="1" fill="#3fd8ff" />
            <rect x="43" y="14" width="6" height="6" rx="1" fill="#3fd8ff" />
            <rect x="43" y="36" width="6" height="6" rx="1" fill="#3fd8ff" />
            <rect x="25" y="46" width="6" height="6" rx="1" fill="#3fd8ff" />
            <rect x="7" y="36" width="6" height="6" rx="1" fill="#3fd8ff" />
            <rect x="7" y="14" width="6" height="6" rx="1" fill="#3fd8ff" />
            {/* Central Lime Chevron */}
            <path
              d="M22 31L28 23L34 31"
              stroke="#c6ff2e"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          style={{
            marginTop: '14px',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(244,246,250,0.65)',
          }}
        >
          INITIALIZING GRIDSENSE AI ISOMETRIC TELEMETRY
        </div>
      </div>

      {/* =====================================================================
          2. NORVA FIXED 3-COLUMN NAVIGATION BAR (58u tall)
          ===================================================================== */}
      <header className="nv-nav">
        <div className="nv-nav-left">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: window.innerHeight * 1.1, behavior: 'smooth' })}
            className="nv-nav-link"
          >
            <span>OUR PIPELINE</span>
          </button>
          <button
            type="button"
            onClick={() => twinSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="nv-nav-link"
          >
            <span>3D GRID TWIN</span>
          </button>
          <button
            type="button"
            onClick={() => solRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="nv-nav-link"
          >
            <span>SOLUTIONS</span>
          </button>
          <button
            type="button"
            onClick={() => onLaunchDashboard('performance')}
            className="nv-nav-link"
          >
            <span>BENCHMARKS</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
          <button type="button" onClick={onStartDemoMode} className="nv-pill nv-pill-grey">
            <Play className="w-3 h-3 fill-current text-[#c6ff2e]" />
            <span>GUIDED DEMO</span>
          </button>
          <button
            type="button"
            onClick={() => onLaunchDashboard('overview')}
            className="nv-pill nv-pill-lime"
          >
            <span>CONTROL CENTRE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* =====================================================================
          3. 460vh PINNED NORVA ISOMETRIC NIGHT-GRID SCROLL STAGE
          ===================================================================== */}
      <section className="nv-track" ref={trackRef}>
        <div className="nv-scene" ref={sceneRef}>
          {/* Isometric Night-City Video (60fps, keyframe every 8 frames, instant scrub) */}
          <video
            ref={videoRef}
            className="nv-video"
            poster={NORVA_POSTER_JPG}
            src={NORVA_DESKTOP_MP4}
            muted
            playsInline
            preload="auto"
          />

          {/* Top & Bottom Readability Vignette Shade */}
          <div className="nv-shade" />

          {/* 3D Tilting Headline Stage (lies back into the isometric ground on scroll) */}
          <div className="nv-hero-stage">
            <div className="nv-hero-copy" ref={heroCopyRef}>
              <span className="gs-chip">
                Intelligence for a Resilient Energy Grid · Frozen v1
              </span>
              <h1>
                Anticipate Grid Stress
                <br />
                Four Hours Ahead
              </h1>
              <p className="nv-hero-sub">
                64,860 verified SCADA intervals. Causal Residual HGB forecasting.
                <br />
                We mobilize historical demand lags, seasonal regime diagnostics, and
                <br />
                counterfactual storage dispatch before megawatt ramps become critical.
              </p>
            </div>
          </div>

          {/* Scroll Cue with Draining Lime Underline */}
          <div className="nv-scroll-cue" ref={scrollCueRef}>
            <div className="nv-scroll-cue-label">SCROLL TO GLIDE TO THE INTELLIGENCE HUB</div>
            <div className="nv-scroll-cue-line">
              <div className="nv-scroll-cue-fill" ref={scrollCueFillRef} />
            </div>
          </div>

          {/* MOSSLINE 4 Pinging Lime Hotspots over the Isometric Infrastructure */}
          {GRID_HOTSPOTS.map((hs, i) => (
            <div
              key={hs.label}
              ref={(el) => {
                hotspotRefs.current[i] = el;
              }}
              style={{ left: hs.left, top: hs.top, visibility: 'hidden' }}
              className={`gs-hotspot ${openHotspotIndex === i ? 'is-open' : ''}`}
              onClick={() => {
                setOpenHotspotIndex(i);
                onLaunchDashboard(hs.tab);
              }}
            >
              <span className="gs-hs-dot" />
              <span className="gs-hs-pill">
                <span>{hs.label}</span>
                <em>{hs.value}</em>
              </span>
            </div>
          ))}

          {/* NORVA Bottom-Left 4-Step Expanding Process List */}
          <div
            className="nv-process"
            ref={processBoxRef}
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="nv-proc-header">
              <span>GRIDSENSE 4-STAGE INTELLIGENCE PIPELINE</span>
              {manualStepOverride !== null && (
                <button
                  type="button"
                  onClick={() => setManualStepOverride(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c6ff2e',
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  AUTO-SCROLL SYNC ↻
                </button>
              )}
            </div>

            {PROCESS_STEPS.map((step, idx) => {
              const isActive = displayedStep === idx;
              return (
                <div
                  key={step.num}
                  className={`nv-proc-row ${isActive ? 'is-active' : ''}`}
                  onClick={() => setManualStepOverride(idx)}
                >
                  <div className="nv-proc-top">
                    <span className="nv-proc-num">{step.num}</span>
                    <span className="nv-proc-title">{step.title}</span>
                  </div>
                  <div className="nv-proc-body-wrap">
                    <div className="nv-proc-body-inner">
                      <div className="nv-proc-body">
                        <p>{step.body}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchDashboard(step.targetTab);
                          }}
                          className="nv-proc-action cursor-pointer bg-transparent border-none p-0"
                        >
                          <span>{step.actionLabel}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MOSSLINE Right-Side Frosted Glass Telemetry Card + Sparkline + 5-Row Module List */}
          <div
            className="gs-hub-panel"
            ref={hubPanelRef}
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div className="gs-glass-card">
              <span className="gs-glass-tag">3,150.4 MW MAE</span>
              <h4>
                Out-of-Sample Error
                <br />
                Reduction vs Baseline
              </h4>
              <div className="gs-glass-sub">17,472 Pooled Intervals · R² 0.965</div>

              <div className="gs-glass-metric-row">
                <span className="gs-glass-big" ref={glassBigNumRef}>
                  -0.0%
                </span>
                <span className="gs-glass-unit">vs 5,433.4 MW Naive</span>
              </div>

              <svg className="gs-spark-svg" viewBox="0 0 220 70" fill="none">
                <polyline
                  ref={sparkPathRef}
                  points="0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10"
                  stroke="#c6ff2e"
                  strokeWidth="1.8"
                  fill="none"
                />
                <circle cx="90" cy="44" r="2.5" fill="#ffffff" />
                <circle cx="150" cy="30" r="2.5" fill="#3fd8ff" />
                <circle cx="214" cy="10" r="3.5" fill="#c6ff2e" />
              </svg>

              <div className="gs-glass-foot">
                <span>2025 Q3 · 2026 Q1 · 2026 Q3</span>
                <span style={{ color: '#3fd8ff' }}>+4.0h HORIZON</span>
              </div>
            </div>

            <div className="gs-module-list">
              {HUB_MODULES.map((m) => (
                <div
                  key={m.idx}
                  className="gs-mod-row"
                  onClick={() => onLaunchDashboard(m.tab)}
                >
                  <span style={{ opacity: 0.6 }}>{m.idx}</span>
                  <span>{m.label}</span>
                  <span style={{ textAlign: 'right' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. INTERACTIVE 3D WEBGL SMART GRID DIGITAL TWIN SECTION
          ===================================================================== */}
      <section
        ref={twinSectionRef}
        className="relative z-30 bg-[#0D1524] border-t border-white/12 pt-16 pb-32 px-6 lg:px-10"
      >
        <div className="max-w-[1380px] mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="gs-chip">Interactive 3D Digital Twin</span>
                <span className="gs-chip-cyan">Three.js WebGL · Real-Time Raycasting</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#F4F6FA] leading-[1.04]">
                Inspect the Miniature Smart Grid in Real-Time 3D.
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#A8B5C5] max-w-md leading-relaxed">
              Orbit, zoom, explode structural elevation layers, and click any 3D substation, wind
              turbine corridor, solar PV array, or BESS container bay to launch its analytical
              module.
            </p>
          </div>

          <div className="border border-white/15 rounded-xl overflow-hidden shadow-2xl">
            <SmartGrid3DScene
              heightClass="h-[580px] lg:h-[640px]"
              onSelectModule={(tab) => onLaunchDashboard(tab)}
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. MOSSLINE SLIDING MIST-WHITE SOLUTIONS SECTION (#sol)
          ===================================================================== */}
      <section id="sol" ref={solRef}>
        <div className="sol-container">
          <div className="sol-head">
            <div>
              <span className="gs-chip">GridSense Solutions</span>
              <h2>Validating what the electricity grid demands in real time</h2>
            </div>
            <p>
              Verified 15-minute SCADA demand records, causal residual boosting, and transparent
              regime diagnostics fused into one auditable platform — so every operational forecast
              is backed by empirical evidence.
            </p>
          </div>

          <div className="sol-cards">
            {/* Card 1 */}
            <div
              className="sol-card"
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              onClick={() => onLaunchDashboard('forecast')}
            >
              <div
                className="sol-card-bg"
                style={{
                  backgroundImage: `url("${hubCoreImg}")`,
                }}
              />
              <div className="sol-card-ov" />
              <div className="sol-card-top">
                <span className="sol-card-label">[Demand Intelligence]</span>
                <span className="sol-card-circle">→</span>
              </div>
              <div className="sol-card-bot">
                <h3>
                  Four-hour ahead
                  <br />
                  national load forecasting
                </h3>
                <p>
                  Combines 9 causal historical demand lags and cyclical clocks with source-hour
                  shrinkage to cut 4-hour prediction error by 42.0% over Seasonal Naive.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="sol-card"
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              onClick={() => onLaunchDashboard('data-health')}
            >
              <div
                className="sol-card-bg"
                style={{
                  backgroundImage: `url("${renewableCorridorImg}")`,
                }}
              />
              <div className="sol-card-ov" />
              <div className="sol-card-top">
                <span className="sol-card-label">[Data Provenance &amp; Audit]</span>
                <span className="sol-card-circle">→</span>
              </div>
              <div className="sol-card-bot">
                <h3>
                  SHA-256 SCADA lineage
                  <br />
                  &amp; supply boundaries
                </h3>
                <p>
                  Audits 64,860 15-minute intervals through 2026-09-29 23:45 IST and strictly
                  isolates scheduled generation (total_gen_mw) from metered physical supply.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="sol-card"
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              onClick={() => onLaunchDashboard('scenario')}
            >
              <div
                className="sol-card-bg"
                style={{
                  backgroundImage: `url("${batterySubstationImg}")`,
                }}
              />
              <div className="sol-card-ov" />
              <div className="sol-card-top">
                <span className="sol-card-label">[Scenario &amp; Risk Lab]</span>
                <span className="sol-card-circle">→</span>
              </div>
              <div className="sol-card-bot">
                <h3>
                  Counterfactual ramps
                  <br />
                  &amp; BESS peak-shaving
                </h3>
                <p>
                  Simulates load surges, solar/wind variability, and user-parameterized battery
                  storage dispatch without fabricating missing national SOC telemetry.
                </p>
              </div>
            </div>
          </div>

          {/* 4 Cubic-Eased Count-Up Stats */}
          <div className="sol-stats">
            <div className="sol-stat">
              <div
                className="sol-stat-num"
                ref={(el) => {
                  statRefs.current[0] = el;
                }}
              >
                0
              </div>
              <div className="sol-stat-lbl">Verified 15m SCADA intervals</div>
            </div>
            <div className="sol-stat">
              <div
                className="sol-stat-num"
                ref={(el) => {
                  statRefs.current[1] = el;
                }}
              >
                0.0%
              </div>
              <div className="sol-stat-lbl">MAE reduction vs Seasonal Naive</div>
            </div>
            <div className="sol-stat">
              <div
                className="sol-stat-num"
                ref={(el) => {
                  statRefs.current[2] = el;
                }}
              >
                0.000
              </div>
              <div className="sol-stat-lbl">Pooled out-of-sample R² fit</div>
            </div>
            <div className="sol-stat">
              <div
                className="sol-stat-num"
                ref={(el) => {
                  statRefs.current[3] = el;
                }}
              >
                0
              </div>
              <div className="sol-stat-lbl">Chronological evaluation samples</div>
            </div>
          </div>

          {/* Bottom Direct Control Centre Bar */}
          <div className="mt-16 pt-8 border-t border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="font-mono text-xs uppercase tracking-wider text-[#3b4859]">
              GRIDSENSE AI · INTELLIGENCE FOR A RESILIENT ENERGY GRID · FROZEN PROSPECTIVE v1
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartDemoMode}
                className="nv-pill nv-pill-grey"
              >
                <Play className="w-3 h-3 fill-current text-[#c6ff2e]" />
                <span>START 7-STAGE GUIDED TOUR</span>
              </button>
              <button
                type="button"
                onClick={() => onLaunchDashboard('overview')}
                className="nv-pill nv-pill-lime"
              >
                <span>ENTER CONTROL CENTRE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
