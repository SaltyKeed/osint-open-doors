"use client";
// From Aceternity UI (ui.aceternity.com, "GitHub Globe"), added with the shadcn registry.
// Adapted to the project's lint and strict typing rules (D23), then reworked (D25):
// the countries are built once instead of at every new arc, the scene is not recreated
// at every render, and the camera follows the size of its container.
// D28: the camera can turn and zoom towards a place (focus), and rings ("pings") mark
// the places given by the parent instead of random arc starts.
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, Scene, Fog, Quaternion, Vector3, type Group } from "three";
import ThreeGlobe from "three-globe";
import { useThree, useFrame, Canvas, extend } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "@/data/globe.json";
declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & {
      new (): ThreeGlobe;
    };
  }
}

extend({ ThreeGlobe: ThreeGlobe });

const RING_PROPAGATION_SPEED = 3;
// Distance of the camera from the center of the globe (the globe radius is 100).
const cameraZ = 300;

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type LatLng = { lat: number; lng: number };

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ringColor?: string; // hex color of the pings
  backgroundColor?: string; // hex color of the page behind the globe (fog)
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
  // Places marked with expanding rings (the sources being searched, a commune).
  pings?: LatLng[];
  // When set, the camera turns towards this place and stops rotating.
  focus?: LatLng | null;
  // Distance of the camera when focused: 300 shows the whole globe, 112 a country.
  distance?: number;
}

export function Globe({ globeConfig, data, pings = [] }: WorldProps) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Group>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    ringColor: "#ffffff",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  // Initialize globe only once
  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      groupRef.current.add(globeRef.current);
      setIsInitialized(true);
    }
  }, []);

  // Build material when globe is initialized or when relevant props change
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;

    const globeMaterial = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    globeMaterial.color = new Color(globeConfig.globeColor);
    globeMaterial.emissive = new Color(globeConfig.emissive);
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
    globeMaterial.shininess = globeConfig.shininess || 0.9;
  }, [
    isInitialized,
    globeConfig.globeColor,
    globeConfig.emissive,
    globeConfig.emissiveIntensity,
    globeConfig.shininess,
  ]);

  // Countries and atmosphere: built once. This is the costly part (hexagons computed
  // from a 417 KB GeoJSON); redoing it at every new arc froze the page (D25).
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;
    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);
  }, [
    isInitialized,
    defaultProps.showAtmosphere,
    defaultProps.atmosphereColor,
    defaultProps.atmosphereAltitude,
    defaultProps.polygonColor,
  ]);

  // Arcs and points: rebuilt when data changes (cheap).
  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    const arcs = data;
    const points = [];
    for (const arc of arcs) {
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.startLat,
        lng: arc.startLng,
      });
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.endLat,
        lng: arc.endLng,
      });
    }

    // remove duplicates for same lat and lng
    const filteredPoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          ["lat", "lng"].every(
            (k) => v2[k as "lat" | "lng"] === v[k as "lat" | "lng"],
          ),
        ) === i,
    );

    globeRef.current
      .arcsData(data)
      .arcStartLat((d) => (d as { startLat: number }).startLat * 1)
      .arcStartLng((d) => (d as { startLng: number }).startLng * 1)
      .arcEndLat((d) => (d as { endLat: number }).endLat * 1)
      .arcEndLng((d) => (d as { endLng: number }).endLng * 1)
      .arcColor((e: object) => (e as { color: string }).color)
      .arcAltitude((e) => (e as { arcAlt: number }).arcAlt * 1)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)] ?? 0.3)
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => (e as { order: number }).order * 1)
      .arcDashGap(15)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    globeRef.current
      .pointsData(filteredPoints)
      .pointColor((e) => (e as { color: string }).color)
      .pointsMerge(true)
      .pointAltitude(0.0)
      .pointRadius(2);
  }, [
    isInitialized,
    data,
    defaultProps.pointSize,
    defaultProps.arcLength,
    defaultProps.arcTime,
  ]);

  // Pings: rings that expand and fade out, repeated, on the places given by the parent.
  const rgb = hexToRgb(defaultProps.ringColor) ?? { r: 255, g: 255, b: 255 };
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;
    globeRef.current
      .ringsData(pings)
      .ringColor(() => (t: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - t})`)
      .ringMaxRadius(defaultProps.maxRings)
      .ringPropagationSpeed(RING_PROPAGATION_SPEED)
      .ringRepeatPeriod((defaultProps.arcTime * defaultProps.arcLength) / defaultProps.rings);
  }, [
    isInitialized,
    pings,
    rgb.r,
    rgb.g,
    rgb.b,
    defaultProps.maxRings,
    defaultProps.arcTime,
    defaultProps.arcLength,
    defaultProps.rings,
  ]);

  return <group ref={groupRef} />;
}

export function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    // Capped at 2: a 4K screen would otherwise draw 4 times more pixels for no visible gain.
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gl.setSize(size.width, size.height);
    gl.setClearColor(0xffaaff, 0);
  }, [gl, size.width, size.height]);

  return null;
}

// Turns the camera towards `focus` and brings it to `distance`, a bit at each frame.
// The direction turns along the surface (quaternion slerp) instead of a straight line,
// which would cross the globe when the target is on the other side.
function CameraRig({ focus, distance }: { focus?: LatLng | null; distance: number }) {
  const { camera } = useThree();
  const goal = useMemo(
    () => (focus ? new Vector3(...cameraPosition(focus, 1)) : null),
    [focus],
  );
  useFrame((_, delta) => {
    if (!goal) return;
    // Same speed on a 60 Hz or a 144 Hz screen: the step depends on the time elapsed.
    const t = 1 - Math.exp(-delta * 1.8);
    const radius = camera.position.length();
    const direction = camera.position.clone().normalize();
    const turn = new Quaternion().slerp(new Quaternion().setFromUnitVectors(direction, goal), t);
    direction.applyQuaternion(turn);
    camera.position.copy(direction.multiplyScalar(radius + (distance - radius) * t));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function World(props: WorldProps) {
  const { globeConfig, focus, distance = cameraZ } = props;
  // Created once: World re-renders at every step of the search.
  const scene = useMemo(() => {
    const created = new Scene();
    created.fog = new Fog(globeConfig.backgroundColor ?? 0xffffff, 400, 2000);
    return created;
  }, [globeConfig.backgroundColor]);
  // The original component ignored initialPosition: the camera now starts above it.
  const position = cameraPosition(globeConfig.initialPosition ?? { lat: 0, lng: 0 }, cameraZ);
  // Camera settings instead of a camera object: React Three Fiber then updates the
  // aspect ratio with the container, so the parent only needs a fixed height.
  // near = 1 (instead of 180): the camera can come close to the surface (D28).
  return (
    <Canvas scene={scene} camera={{ fov: 50, near: 1, far: 1800, position }}>
      <WebGLRendererConfig />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe {...props} />
      <CameraRig focus={focus} distance={distance} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        // Kiosk: the visitor watches, the camera is driven by the search.
        enableRotate={false}
        minDistance={105}
        maxDistance={cameraZ}
        autoRotateSpeed={globeConfig.autoRotateSpeed ?? 1}
        autoRotate={(globeConfig.autoRotate ?? true) && !focus}
        // Wide enough to look at Switzerland (latitude 47) from above.
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI - 0.35}
      />
    </Canvas>
  );
}

// Camera placed at `distance` above a latitude and longitude, with the same convention
// as three-globe (longitude 0 faces +z).
function cameraPosition({ lat, lng }: LatLng, distance: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  return [
    distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta),
  ];
}

export function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1] ?? "0", 16),
        g: parseInt(result[2] ?? "0", 16),
        b: parseInt(result[3] ?? "0", 16),
      }
    : null;
}
