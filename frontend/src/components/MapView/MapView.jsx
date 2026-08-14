import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BULGARIA_BOUNDS = { lonMin: 22.3, lonMax: 28.6, latMin: 41.2, latMax: 44.2 };
const BULGARIA_MAP_BOUNDS = [
  [BULGARIA_BOUNDS.latMin, BULGARIA_BOUNDS.lonMin],
  [BULGARIA_BOUNDS.latMax, BULGARIA_BOUNDS.lonMax],
];

function toLatLng(x, y) {
  const lon = BULGARIA_BOUNDS.lonMin + (x / 100) * (BULGARIA_BOUNDS.lonMax - BULGARIA_BOUNDS.lonMin);
  const lat = BULGARIA_BOUNDS.latMin + (y / 100) * (BULGARIA_BOUNDS.latMax - BULGARIA_BOUNDS.latMin);
  return [lat, lon];
}

const VEHICLE_COLORS = [
  "#993556", "#0C447C", "#27500A", "#712B13",
  "#3C3489", "#085041", "#633806", "#791F1F",
];

const VEHICLE_SPEED_FACTOR = {
  tir: 0.6,
  van: 1.0,
  small_car: 1.4,
};

const KM_PER_DEGREE = 111;
const BASE_KM_PER_ANIMATED_SECOND = 0.05;
const MIN_LOOP_DURATION = 2;

const CAR_ICON_SVG = {
  tir: (color) => `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="9" width="9" height="8" rx="1" fill="${color}"/><rect x="10" y="6" width="10" height="11" rx="1" fill="${color}"/><rect x="13" y="8" width="4" height="4" fill="#ffffff" opacity="0.55"/><circle cx="5" cy="18" r="2" fill="#222222"/><circle cx="16" cy="18" r="2" fill="#222222"/></svg>`,
  van: (color) => `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="18" height="9" rx="2" fill="${color}"/><rect x="15" y="9" width="4" height="4" fill="#ffffff" opacity="0.55"/><circle cx="7" cy="17" r="2" fill="#222222"/><circle cx="17" cy="17" r="2" fill="#222222"/></svg>`,
  small_car: (color) => `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13 L5 8 Q6 7 8 7 L16 7 Q18 7 19 8 L21 13 Z" fill="${color}"/><rect x="1" y="13" width="22" height="4" rx="2" fill="${color}"/><rect x="8" y="8" width="6" height="4" fill="#ffffff" opacity="0.55"/><circle cx="6" cy="18" r="2" fill="#222222"/><circle cx="18" cy="18" r="2" fill="#222222"/></svg>`,
};

function getVehicleIcon(type, color) {
  const builder = CAR_ICON_SVG[type] || CAR_ICON_SVG.van;
  return L.divIcon({
    html: builder(color),
    className: "vehicle-car-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function buildPath(depot, stops) {
  return [depot, ...stops, depot];
}

function pathLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dLat = points[i + 1][0] - points[i][0];
    const dLon = points[i + 1][1] - points[i][1];
    total += Math.sqrt(dLat * dLat + dLon * dLon);
  }
  return total;
}

function positionAlongPath(points, t) {
  const total = pathLength(points);
  if (total === 0) return points[0];

  let target = t * total;
  for (let i = 0; i < points.length - 1; i++) {
    const dLat = points[i + 1][0] - points[i][0];
    const dLon = points[i + 1][1] - points[i][1];
    const segLength = Math.sqrt(dLat * dLat + dLon * dLon);
    if (target <= segLength) {
      const ratio = segLength === 0 ? 0 : target / segLength;
      return [points[i][0] + dLat * ratio, points[i][1] + dLon * ratio];
    }
    target -= segLength;
  }
  return points[points.length - 1];
}

function MapView({ routes, vehicles, orders }) {
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameRef = useRef();
  const containerRef = useRef();
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let last = performance.now();
    let elapsed = 0;
    function animate(now) {
      const delta = (now - last) / 1000;
      last = now;
      elapsed += delta * speedRef.current;
      setTick(elapsed);
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  if (!routes || routes.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 480, color: "#888780" }}>
        No routes yet
      </div>
    );
  }

  const vehicleById = Object.fromEntries((vehicles || []).map((v) => [v.id, v]));
  const orderById = Object.fromEntries((orders || []).map((o) => [o.id, o]));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: isFullscreen ? "100vh" : 480 }}>
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, display: "flex", gap: "8px", alignItems: "center", background: "rgba(255,255,255,0.9)", padding: "6px 10px", borderRadius: 8 }}>
        <span style={{ fontSize: 13 }}>Speed</span>
        <input
          type="range"
          min="0.25"
          max="3"
          step="0.25"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        />
        <span style={{ fontSize: 13, width: 32 }}>{speed}x</span>
        <button type="button" onClick={toggleFullscreen}>
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>
      </div>
      <MapContainer bounds={BULGARIA_MAP_BOUNDS} style={{ width: "100%", height: "100%", borderRadius: 12 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routes.map((route, idx) => {
          const vehicle = vehicleById[route.vehicle_id];
          if (!vehicle || route.stops.length === 0) return null;

          const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
          const depot = toLatLng(vehicle.depot_x, vehicle.depot_y);
          const stopPoints = route.stops
            .map((stop) => orderById[stop.order_id])
            .filter(Boolean)
            .map((o) => toLatLng(o.x, o.y));

          const fullPath = route.geometry && route.geometry.length > 0
            ? route.geometry
            : buildPath(depot, stopPoints);

          const typeFactor = VEHICLE_SPEED_FACTOR[vehicle.vehicle_type] || 1.0;
          const pathKm = pathLength(fullPath) * KM_PER_DEGREE;
          const loopDuration = Math.max(
            pathKm / (BASE_KM_PER_ANIMATED_SECOND * typeFactor),
            MIN_LOOP_DURATION
          );
          const t = (tick % loopDuration) / loopDuration;
          const vehiclePos = positionAlongPath(fullPath, t);
          const icon = getVehicleIcon(vehicle.vehicle_type, color);

          return (
            <React.Fragment key={route.id}>
              <Polyline positions={fullPath} pathOptions={{ color, weight: 4, opacity: 0.85 }} />
              <CircleMarker center={depot} radius={7} pathOptions={{ color, fillColor: color, fillOpacity: 1 }}>
                <Tooltip>{vehicle.name} (depot)</Tooltip>
              </CircleMarker>
              {stopPoints.map((p, i) => (
                <CircleMarker
                  key={i}
                  center={p}
                  radius={5}
                  pathOptions={{ color, fillColor: "#FFFFFF", fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip>Stop {i + 1}</Tooltip>
                </CircleMarker>
              ))}
              <Marker position={vehiclePos} icon={icon}>
                <Tooltip>{vehicle.name}</Tooltip>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapView;