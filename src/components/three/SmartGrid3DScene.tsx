import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { DashboardTabId } from '../../types/gridsense';

export interface Grid3DNodeInfo {
  id: string;
  name: string;
  category: string;
  metric: string;
  description: string;
  technicalNote: string;
  targetTab: DashboardTabId;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

export const GRID_3D_NODES: Grid3DNodeInfo[] = [
  {
    id: 'overview',
    name: 'Isometric National Grid Diorama',
    category: 'FULL INFRASTRUCTURE TWIN',
    metric: '64,860 SCADA Rows · 3,150.4 MW MAE',
    description:
      'Interactive 3D architectural twin representing India’s smart grid infrastructure: 400kV substations, rotating wind corridors, utility solar arrays, battery storage bays, and the central ML forecasting hub.',
    technicalNote: 'Drag to orbit · Scroll to zoom · Click any 3D structure or preset below.',
    targetTab: 'overview',
    cameraPos: [26, 20, 28],
    cameraTarget: [0, 1.5, 0],
  },
  {
    id: 'central-hub',
    name: 'GridSense AI Central Intelligence Core',
    category: '4-HOUR RESIDUAL HGB ENGINE',
    metric: 'Pooled R² 0.965 · -42.0% MAE vs Naive',
    description:
      'Synthesizes 9 causal historical features (current demand, 1h/4h/24h lags, 1h rolling mean, and cyclical clocks) to predict national electricity demand 16 fifteen-minute intervals ahead.',
    technicalNote: 'Frozen Config: configs/experiments/demand_4h_prospective_v1.json',
    targetTab: 'forecast',
    cameraPos: [10, 9, 12],
    cameraTarget: [0, 2.2, 0],
  },
  {
    id: 'substation-west',
    name: '400kV Primary Substation & Transformer Yard',
    category: 'AUTHENTIC SCADA TARGET',
    metric: 'demand_met_mw · 15-Minute Cadence',
    description:
      'Captures national electricity demand met across 64,860 verified observations through the 2026-09-29 23:45 IST watermark, strictly separated from scheduled generation (total_gen_mw).',
    technicalNote: 'SHA-256 verified provenance · 0 duplicate timestamps.',
    targetTab: 'data-health',
    cameraPos: [-18, 10, 14],
    cameraTarget: [-10, 1.8, 2],
  },
  {
    id: 'wind-ridge',
    name: 'Utility Wind & Solar Generation Corridor',
    category: 'RENEWABLE INTELLIGENCE',
    metric: 'Source-Hour Shrinkage (α = 0.91–0.96)',
    description:
      'Models diurnal solar relief and wind ramp variability while strictly preventing future-observed weather leakage at forecast issue time.',
    technicalNote: 'Evaluated across 2025 Q3, 2026 Q1, and 2026 Q3 regimes.',
    targetTab: 'performance',
    cameraPos: [14, 12, -16],
    cameraTarget: [4, 3.0, -9],
  },
  {
    id: 'bess-containers',
    name: 'Utility Battery Energy Storage Bay (BESS)',
    category: 'SCENARIO SIMULATION LAB',
    metric: 'User-Parameterized SOC & Dispatch',
    description:
      'Simulates peak-shaving battery discharge and renewable offsets under explicit user assumptions without fabricating missing national SOC telemetry.',
    technicalNote: 'Configurable MWh capacity, initial SOC %, max MW, and efficiency.',
    targetTab: 'scenario',
    cameraPos: [16, 9, 16],
    cameraTarget: [8, 1.5, 8],
  },
];

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();

interface SmartGrid3DSceneProps {
  heightClass?: string;
  onSelectModule?: (tab: DashboardTabId) => void;
  compactHud?: boolean;
  explodeFactor?: number;
}

export const SmartGrid3DScene: React.FC<SmartGrid3DSceneProps> = ({
  heightClass = 'h-screen',
  onSelectModule,
  compactHud = false,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('overview');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [explodedElevation, setExplodedElevation] = useState<number>(0);
  const [flowSpeed, setFlowSpeed] = useState<number>(1.0);

  // Refs for mutable state shared with the WebGL loop without re-creating the scene
  const selectedNodeRef = useRef<Grid3DNodeInfo>(GRID_3D_NODES[0]);
  const cameraTransitionActiveRef = useRef<boolean>(false);
  const explodedRef = useRef<number>(0);
  const flowSpeedRef = useRef<number>(1.0);
  const onSelectNodeCallbackRef = useRef<(id: string) => void>(() => {});

  onSelectNodeCallbackRef.current = (id: string) => {
    const found = GRID_3D_NODES.find((n) => n.id === id) || GRID_3D_NODES[0];
    selectedNodeRef.current = found;
    cameraTransitionActiveRef.current = true;
    setSelectedNodeId(found.id);
  };

  const handlePresetClick = (node: Grid3DNodeInfo) => {
    selectedNodeRef.current = node;
    cameraTransitionActiveRef.current = true;
    setSelectedNodeId(node.id);
  };

  useEffect(() => {
    explodedRef.current = explodedElevation;
  }, [explodedElevation]);

  useEffect(() => {
    flowSpeedRef.current = flowSpeed;
  }, [flowSpeed]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard per Three.js skill instructions
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d18);
    scene.fog = new THREE.FogExp2(0x080d18, 0.014);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 220);
    camera.position.set(26, 20, 28);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Three-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x3fd8ff, 0x0d1524, 0.65);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
    keyLight.position.set(22, 34, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 24;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3fd8ff, 1.35);
    rimLight.position.set(-24, 18, -20);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 62;
    controls.target.set(0, 1.5, 0);

    controls.addEventListener('start', () => {
      cameraTransitionActiveRef.current = false;
    });

    // Shared PBR Materials Library (varied roughness & metalness >= 0.25 across adjacent parts)
    const matDarkTerrain = new THREE.MeshStandardMaterial({
      color: 0x0d1524,
      roughness: 0.88,
      metalness: 0.15,
    });
    const matGraphiteHull = new THREE.MeshStandardMaterial({
      color: 0x172235,
      roughness: 0.42,
      metalness: 0.78,
    });
    const matBrushedSteel = new THREE.MeshStandardMaterial({
      color: 0x2c3e5a,
      roughness: 0.22,
      metalness: 0.92,
    });
    const matDarkSlate = new THREE.MeshStandardMaterial({
      color: 0x101929,
      roughness: 0.68,
      metalness: 0.35,
    });
    const matSolarCell = new THREE.MeshPhysicalMaterial({
      color: 0x0b2545,
      roughness: 0.14,
      metalness: 0.85,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
    const matCyanEmissive = new THREE.MeshStandardMaterial({
      color: 0x3fd8ff,
      emissive: 0x3fd8ff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.5,
    });
    const matLimeEmissive = new THREE.MeshStandardMaterial({
      color: 0xc6ff2e,
      emissive: 0xc6ff2e,
      emissiveIntensity: 1.9,
      roughness: 0.2,
      metalness: 0.4,
    });
    const matGlassCore = new THREE.MeshPhysicalMaterial({
      color: 0x3fd8ff,
      transparent: true,
      opacity: isSoftwareGl ? 0.45 : 0.85,
      transmission: isSoftwareGl ? 0 : 0.88,
      roughness: 0.08,
      metalness: 0.1,
      ior: 1.52,
      depthWrite: false,
    });

    // Root Diorama Platform & Procedural Coordinate Grid
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(38, 1.2, 32), matDarkTerrain);
    baseSlab.position.set(0, -0.6, 0);
    baseSlab.receiveShadow = true;
    worldGroup.add(baseSlab);

    const bevelTrim = new THREE.Mesh(new THREE.BoxGeometry(38.6, 0.3, 32.6), matBrushedSteel);
    bevelTrim.position.set(0, -1.05, 0);
    worldGroup.add(bevelTrim);

    const gridHelper = new THREE.GridHelper(36, 36, 0x3fd8ff, 0x1e2d44);
    gridHelper.position.y = 0.02; // Offset >= 0.02 to prevent coplanar Z-fighting
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.28;
    worldGroup.add(gridHelper);

    const clickableProxies: THREE.Object3D[] = [];
    const expandableLayers: Array<{ obj: THREE.Object3D; baseY: number; liftScale: number }> = [];

    // =========================================================================
    // COMPOSITE MODEL 1: CENTRAL INTELLIGENCE HUB (8-Part Architectural Group)
    // =========================================================================
    const centralHubGroup = new THREE.Group();
    centralHubGroup.position.set(0, 0, 0);
    worldGroup.add(centralHubGroup);

    const hubPlinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.6, 8), matDarkSlate);
    hubPlinth.position.y = 0.3;
    hubPlinth.receiveShadow = true;
    centralHubGroup.add(hubPlinth);

    const hubLowerCore = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.1, 2.2, 8),
      matGraphiteHull
    );
    hubLowerCore.position.y = 1.7;
    hubLowerCore.castShadow = true;
    centralHubGroup.add(hubLowerCore);

    const hubGlassAtrium = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 1.8, 8),
      matGlassCore
    );
    hubGlassAtrium.position.y = 3.7;
    hubGlassAtrium.renderOrder = 2;
    centralHubGroup.add(hubGlassAtrium);
    expandableLayers.push({ obj: hubGlassAtrium, baseY: 3.7, liftScale: 1.4 });

    const hubInnerReactor = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      matCyanEmissive
    );
    hubInnerReactor.position.y = 3.7;
    centralHubGroup.add(hubInnerReactor);

    const hubCrownCap = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.6, 0.45, 8),
      matBrushedSteel
    );
    hubCrownCap.position.y = 4.85;
    hubCrownCap.castShadow = true;
    centralHubGroup.add(hubCrownCap);
    expandableLayers.push({ obj: hubCrownCap, baseY: 4.85, liftScale: 2.4 });

    const hubRingCyan = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.07, 12, 48),
      matCyanEmissive
    );
    hubRingCyan.rotation.x = Math.PI / 2;
    hubRingCyan.position.y = 0.65;
    centralHubGroup.add(hubRingCyan);

    const hubRingLime = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.06, 12, 36),
      matLimeEmissive
    );
    hubRingLime.rotation.x = Math.PI / 2;
    hubRingLime.position.y = 5.15;
    centralHubGroup.add(hubRingLime);
    expandableLayers.push({ obj: hubRingLime, baseY: 5.15, liftScale: 2.8 });

    const hubProxy = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 6, 6.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hubProxy.position.set(0, 3, 0);
    hubProxy.userData.nodeId = 'central-hub';
    worldGroup.add(hubProxy);
    clickableProxies.push(hubProxy);

    // =========================================================================
    // COMPOSITE MODEL 2: 400kV SUBSTATION TRANSFORMER YARD (-10, 0, 2)
    // =========================================================================
    const substationGroup = new THREE.Group();
    substationGroup.position.set(-10.5, 0, 2.5);
    worldGroup.add(substationGroup);

    const subPad = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.35, 8.5), matDarkSlate);
    subPad.position.y = 0.175;
    subPad.receiveShadow = true;
    substationGroup.add(subPad);

    // 2 Multi-part High-Voltage Transformers with Cooling Radiators & Bushings
    for (const txOffset of [-2.4, 2.4]) {
      const txGroup = new THREE.Group();
      txGroup.position.set(txOffset, 0.35, 0.5);
      substationGroup.add(txGroup);

      const txMainTank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 1.8), matGraphiteHull);
      txMainTank.position.y = 1.05;
      txMainTank.castShadow = true;
      txGroup.add(txMainTank);

      const txRadiatorBank = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 1.6, 1.2),
        matBrushedSteel
      );
      txRadiatorBank.position.y = 1.0;
      txGroup.add(txRadiatorBank);

      // Conservator tank on top
      const conservator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 1.8, 16),
        matBrushedSteel
      );
      conservator.rotation.z = Math.PI / 2;
      conservator.position.set(0, 2.45, -0.3);
      txGroup.add(conservator);
      expandableLayers.push({ obj: conservator, baseY: 2.45, liftScale: 1.2 });

      // 3 High-voltage bushings + cyan insulator tips
      for (const bX of [-0.65, 0, 0.65]) {
        const bushing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.14, 0.9, 12),
          matBrushedSteel
        );
        bushing.position.set(bX, 2.45, 0.35);
        txGroup.add(bushing);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), matCyanEmissive);
        tip.position.set(bX, 2.95, 0.35);
        txGroup.add(tip);
      }
    }

    // Overhead Substation Gantry Portal Frame
    const gantryLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.6, 0.35), matBrushedSteel);
    gantryLeft.position.set(-4.1, 2.3, -2.5);
    substationGroup.add(gantryLeft);

    const gantryRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.6, 0.35), matBrushedSteel);
    gantryRight.position.set(4.1, 2.3, -2.5);
    substationGroup.add(gantryRight);

    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.35, 0.45), matBrushedSteel);
    gantryBeam.position.set(0, 4.5, -2.5);
    substationGroup.add(gantryBeam);
    expandableLayers.push({ obj: gantryBeam, baseY: 4.5, liftScale: 1.5 });

    const subProxy = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 5, 8.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    subProxy.position.set(-10.5, 2.5, 2.5);
    subProxy.userData.nodeId = 'substation-west';
    worldGroup.add(subProxy);
    clickableProxies.push(subProxy);

    // =========================================================================
    // COMPOSITE MODEL 3: ROTATING 3D WIND TURBINE CORRIDOR & SOLAR FIELD
    // =========================================================================
    const rotorBladesList: THREE.Group[] = [];
    const turbineCoords: Array<[number, number, number]> = [
      [-6, 0, -9.5],
      [0, 0, -10.5],
      [6, 0, -9.5],
      [11.5, 0, -7.5],
    ];

    turbineCoords.forEach(([tx, ty, tz], idx) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(tx, ty, tz);
      worldGroup.add(tGroup);

      // Foundation pad
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 16), matDarkSlate);
      pad.position.y = 0.175;
      tGroup.add(pad);

      // Tapered steel tower
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.48, 6.8, 16),
        matBrushedSteel
      );
      tower.position.y = 3.5;
      tower.castShadow = true;
      tGroup.add(tower);

      // Nacelle housing
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 1.6), matGraphiteHull);
      nacelle.position.set(0, 6.95, 0.2);
      tGroup.add(nacelle);

      // Lime status beacon on top of nacelle
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), matLimeEmissive);
      beacon.position.set(0, 7.38, -0.3);
      tGroup.add(beacon);

      // Rotor hub + 3 aerodynamic blades
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 6.95, 1.05);
      rotorGroup.rotation.z = idx * 0.9;
      tGroup.add(rotorGroup);

      const hubNose = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.65, 16),
        matBrushedSteel
      );
      hubNose.rotation.x = Math.PI / 2;
      hubNose.position.z = 0.2;
      rotorGroup.add(hubNose);

      for (let b = 0; b < 3; b++) {
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = (b * Math.PI * 2) / 3;
        const bladeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 2.85, 0.06),
          matBrushedSteel
        );
        bladeMesh.position.y = 1.45;
        bladeHolder.add(bladeMesh);
        rotorGroup.add(bladeHolder);
      }

      rotorBladesList.push(rotorGroup);
    });

    // Utility Solar PV Array Field (12 tilted multi-part solar tables)
    const solarFieldGroup = new THREE.Group();
    solarFieldGroup.position.set(9.5, 0, -2.5);
    worldGroup.add(solarFieldGroup);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const panelGroup = new THREE.Group();
        panelGroup.position.set((col - 1) * 2.8, 0, (row - 1) * 2.4);
        solarFieldGroup.add(panelGroup);

        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8),
          matBrushedSteel
        );
        strut.position.y = 0.42;
        panelGroup.add(strut);

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 0.08, 1.55),
          matBrushedSteel
        );
        frame.position.y = 0.85;
        frame.rotation.x = 0.38;
        panelGroup.add(frame);

        const cellSurface = new THREE.Mesh(
          new THREE.BoxGeometry(2.18, 0.05, 1.42),
          matSolarCell
        );
        cellSurface.position.y = 0.89;
        cellSurface.rotation.x = 0.38;
        panelGroup.add(cellSurface);
        expandableLayers.push({ obj: cellSurface, baseY: 0.89, liftScale: 0.8 });
      }
    }

    const windSolarProxy = new THREE.Mesh(
      new THREE.BoxGeometry(24, 8, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    windSolarProxy.position.set(4, 4, -7);
    windSolarProxy.userData.nodeId = 'wind-ridge';
    worldGroup.add(windSolarProxy);
    clickableProxies.push(windSolarProxy);

    // =========================================================================
    // COMPOSITE MODEL 4: UTILITY BATTERY ENERGY STORAGE BAY (BESS) (8, 0, 8.5)
    // =========================================================================
    const bessGroup = new THREE.Group();
    bessGroup.position.set(8.5, 0, 8.2);
    worldGroup.add(bessGroup);

    const bessPad = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.3, 6.8), matDarkSlate);
    bessPad.position.y = 0.15;
    bessPad.receiveShadow = true;
    bessGroup.add(bessPad);

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const containerUnit = new THREE.Group();
        containerUnit.position.set((c - 1) * 2.75, 0.3, (r - 0.5) * 2.6);
        bessGroup.add(containerUnit);

        const enclosure = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.35, 1.25),
          matGraphiteHull
        );
        enclosure.position.y = 0.675;
        enclosure.castShadow = true;
        containerUnit.add(enclosure);

        const hvacUnit = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 1.05, 0.9),
          matBrushedSteel
        );
        hvacUnit.position.set(1.2, 0.62, 0);
        containerUnit.add(hvacUnit);

        const socLightBar = new THREE.Mesh(
          new THREE.BoxGeometry(1.85, 0.08, 0.08),
          matLimeEmissive
        );
        socLightBar.position.set(0, 1.38, 0.6);
        containerUnit.add(socLightBar);
        expandableLayers.push({ obj: socLightBar, baseY: 1.38, liftScale: 1.1 });
      }
    }

    const bessProxy = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3.5, 7),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    bessProxy.position.set(8.5, 1.75, 8.2);
    bessProxy.userData.nodeId = 'bess-containers';
    worldGroup.add(bessProxy);
    clickableProxies.push(bessProxy);

    // =========================================================================
    // COMPOSITE MODEL 5: GLOWING CYAN 3D ENERGY CONDUITS & INSTANCED PACKETS
    // =========================================================================
    const conduitRoutes: THREE.CatmullRomCurve3[] = [
      // Substation to Central Hub
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-10.5, 0.45, 2.5),
        new THREE.Vector3(-5.2, 0.45, 1.2),
        new THREE.Vector3(0, 0.45, 0),
      ]),
      // Wind Corridor to Central Hub
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.45, -10.5),
        new THREE.Vector3(0, 0.45, -5.0),
        new THREE.Vector3(0, 0.45, 0),
      ]),
      // Solar Field to Central Hub
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(9.5, 0.45, -2.5),
        new THREE.Vector3(4.8, 0.45, -1.2),
        new THREE.Vector3(0, 0.45, 0),
      ]),
      // Central Hub to BESS Storage Bay
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.45, 0),
        new THREE.Vector3(4.2, 0.45, 4.1),
        new THREE.Vector3(8.5, 0.45, 8.2),
      ]),
    ];

    conduitRoutes.forEach((curve, idx) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.08, 8, false);
      const tubeMesh = new THREE.Mesh(
        tubeGeo,
        idx === 3 ? matLimeEmissive : matCyanEmissive
      );
      worldGroup.add(tubeMesh);
    });

    // Instanced Energy Flow Packets (> 20 items grouped into a single InstancedMesh)
    const packetCount = 32;
    const packetGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const packetInstanced = new THREE.InstancedMesh(packetGeo, matCyanEmissive, packetCount);
    packetInstanced.frustumCulled = false;
    worldGroup.add(packetInstanced);

    // Pre-warm shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting Setup (throttled pointermove + click)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverTime = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 60) return;
      lastHoverTime = now;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const hitNodeId = hits[0].object.userData.nodeId;
        if (hitNodeId) {
          onSelectNodeCallbackRef.current(hitNodeId);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 4. Animation Loop with Software-WebGL Pacing Guard (afterDraw)
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const speedMult = flowSpeedRef.current;

      // Rotate wind turbine blades smoothly
      for (let i = 0; i < rotorBladesList.length; i++) {
        rotorBladesList[i].rotation.z -= delta * 1.45 * speedMult;
      }

      // Rotate central intelligence core crystal
      hubInnerReactor.rotation.y += delta * 0.85 * speedMult;
      hubInnerReactor.position.y = 3.7 + Math.sin(elapsed * 2.2) * 0.12;

      // Damped structural elevation inspection (exploded view slider)
      const targetExplode = explodedRef.current;
      for (let i = 0; i < expandableLayers.length; i++) {
        const item = expandableLayers[i];
        const targetY = item.baseY + targetExplode * item.liftScale;
        item.obj.position.y = THREE.MathUtils.damp(item.obj.position.y, targetY, 6, delta);
      }

      // Update InstancedMesh energy packets traveling along conduit routes
      for (let i = 0; i < packetCount; i++) {
        const routeIdx = i % conduitRoutes.length;
        const curve = conduitRoutes[routeIdx];
        const t = ((elapsed * 0.32 * speedMult + (i / packetCount) * 4) % 1 + 1) % 1;
        curve.getPointAt(t, _dummyPos);
        _dummyPos.y += 0.08;
        const s = 0.85 + Math.sin(elapsed * 4 + i) * 0.25;
        _dummyScale.set(s, s, s);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        packetInstanced.setMatrixAt(i, _dummyMatrix);
      }
      packetInstanced.instanceMatrix.needsUpdate = true;

      // Smooth exponential camera preset transition
      if (cameraTransitionActiveRef.current) {
        const targetNode = selectedNodeRef.current;
        _targetCamPos.set(...targetNode.cameraPos);
        _targetLookAt.set(...targetNode.cameraTarget);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 4.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5.5, delta);

        if (camera.position.distanceToSquared(_targetCamPos) < 0.04) {
          cameraTransitionActiveRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const currentNode =
    GRID_3D_NODES.find((n) => n.id === selectedNodeId) || GRID_3D_NODES[0];

  return (
    <div className={`relative w-full ${heightClass} bg-[#080D18] overflow-hidden select-none`}>
      {/* Dedicated Isolated WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Subtle Vignette Gradient for Readability */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#080D18] via-transparent to-[#080D18]/75 z-10" />

      {/* Top-Left Minimal Spec & Selected 3D Structure Readout (No backdrop-filter over WebGL) */}
      <div
        className={`absolute ${
          compactHud ? 'top-4 left-4' : 'top-20 left-6 lg:left-12'
        } z-20 max-w-md bg-[#0D1524]/92 border border-white/15 rounded-md p-4 space-y-2 pointer-events-auto`}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
          <span className="text-[#3FD8FF] tracking-wider">{currentNode.category}</span>
          <span className="text-[#C6FF2E]">{currentNode.metric}</span>
        </div>
        <h3 className="font-display text-lg font-bold text-[#F4F6FA] tracking-tight">
          {currentNode.name}
        </h3>
        <p className="text-xs text-[#A8B5C5] leading-relaxed">{currentNode.description}</p>
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] font-mono">
          <span className="text-[#718096] truncate">{currentNode.technicalNote}</span>
          {onSelectModule && (
            <button
              onClick={() => onSelectModule(currentNode.targetTab)}
              className="text-[#3FD8FF] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Inspect Module</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Zero Viewport Occlusion) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(940px,94vw)] pointer-events-auto">
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => setDockCollapsed((c) => !c)}
            className="px-3.5 py-1 text-[11px] font-mono text-[#A8B5C5] hover:text-[#F4F6FA] bg-[#0D1524]/95 border border-white/15 rounded-t flex items-center gap-1.5 cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#3FD8FF]" />
                <span>Show 3D Camera & Inspection Dock</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#3FD8FF]" />
                <span>Hide 3D Controls (Zen View)</span>
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="bg-[#0D1524]/95 border border-white/15 rounded-md p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-2xl">
            {/* Camera Viewpoint Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {GRID_3D_NODES.map((node, idx) => {
                const active = node.id === selectedNodeId;
                return (
                  <button
                    key={node.id}
                    onClick={() => handlePresetClick(node)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#3FD8FF] text-[#0D1524] border-[#3FD8FF] font-semibold'
                        : 'bg-[#172235] text-[#A8B5C5] border-white/10 hover:text-[#F4F6FA] hover:border-white/25'
                    }`}
                  >
                    0{idx + 1}. {node.name.split(' ')[0]}{' '}
                    {node.name.split(' ')[1] === 'National' ? 'Grid' : node.name.split(' ')[1]}
                  </button>
                );
              })}
            </div>

            {/* Exploded Structural Inspection & Energy Flow Speed Sliders */}
            <div className="flex flex-wrap items-center gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-4">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#A8B5C5] whitespace-nowrap">EXPLODE LAYERS</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedElevation}
                  onChange={(e) => setExplodedElevation(parseFloat(e.target.value))}
                  className="w-20 accent-[#3FD8FF] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#A8B5C5] whitespace-nowrap">FLOW SPEED</span>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={flowSpeed}
                  onChange={(e) => setFlowSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-[#C6FF2E] cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  setExplodedElevation(0);
                  setFlowSpeed(1.0);
                  handlePresetClick(GRID_3D_NODES[0]);
                }}
                title="Reset 3D Camera & Layers"
                className="px-2.5 py-1.5 text-xs font-mono text-[#A8B5C5] hover:text-[#F4F6FA] bg-[#172235] border border-white/12 rounded flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
