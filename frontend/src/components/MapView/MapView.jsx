import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
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
  const frameRef = useRef();

  useEffect(() => {
    let start = performance.now();
    function animate(now) {
      setTick((now - start) / 1000);
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  if (!routes || routes.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 480, color: "#888780" }}>
        No routes yet
      </div>
    );
  }

  const vehicleById = Object.fromEntries((vehicles || []).map((v) => [v.id, v]));
  const orderById = Object.fromEntries((orders || []).map((o) => [o.id, o]));
  const loopDuration = 8;

  return (
    <MapContainer bounds={BULGARIA_MAP_BOUNDS} style={{ width: "100%", height: 480, borderRadius: 12 }}>
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

        const fullPath = buildPath(depot, stopPoints);
        const t = (tick % loopDuration) / loopDuration;
        const vehiclePos = positionAlongPath(fullPath, t);

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
            <CircleMarker center={vehiclePos} radius={5} pathOptions={{ color, fillColor: color, fillOpacity: 1 }} />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

export default MapView;