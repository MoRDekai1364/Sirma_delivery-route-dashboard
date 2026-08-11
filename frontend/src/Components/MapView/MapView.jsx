import React, { useEffect, useRef, useState } from "react";

const VEHICLE_COLORS = [
  { band: "#E893B1", dark: "#993556" },
  { band: "#85B7EB", dark: "#0C447C" },
  { band: "#97C459", dark: "#27500A" },
  { band: "#F0997B", dark: "#712B13" },
  { band: "#AFA9EC", dark: "#3C3489" },
  { band: "#5DCAA5", dark: "#085041" },
  { band: "#EF9F27", dark: "#633806" },
  { band: "#F09595", dark: "#791F1F" },
];

function buildPath(depot, stops) {
  const points = [depot, ...stops.map((s) => ({ x: s.x, y: s.y })), depot];
  return points;
}

function pathLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function positionAlongPath(points, t) {
  const total = pathLength(points);
  if (total === 0) return points[0];

  let target = t * total;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segLength = Math.sqrt(dx * dx + dy * dy);
    if (target <= segLength) {
      const ratio = segLength === 0 ? 0 : target / segLength;
      return {
        x: points[i].x + dx * ratio,
        y: points[i].y + dy * ratio,
      };
    }
    target -= segLength;
  }
  return points[points.length - 1];
}

function pointsToSvgPath(points) {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    path += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
  }
  return path;
}

function orthogonalPoints(points) {
  if (points.length === 0) return [];
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    result.push({ x: curr.x, y: prev.y });
    result.push(curr);
  }
  return result;
}

function MapView({ routes, vehicles, orders }) {
  const [tick, setTick] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    let start = performance.now();
    function animate(now) {
      const elapsed = (now - start) / 1000;
      setTick(elapsed);
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  if (!routes || routes.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#888780" }}>
        No routes yet
      </div>
    );
  }

  const vehicleById = Object.fromEntries((vehicles || []).map((v) => [v.id, v]));
  const orderById = Object.fromEntries((orders || []).map((o) => [o.id, o]));

  const allX = [];
  const allY = [];
  routes.forEach((route) => {
    const vehicle = vehicleById[route.vehicle_id];
    if (!vehicle) return;
    allX.push(vehicle.depot_x);
    allY.push(vehicle.depot_y);
    route.stops.forEach((stop) => {
      const order = orderById[stop.order_id];
      if (order) {
        allX.push(order.x);
        allY.push(order.y);
      }
    });
  });

  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 100);
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 100);
  const padding = 10;
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

  const loopDuration = 8;

  return (
    <svg
      viewBox={viewBox}
      style={{ width: "100%", height: 480, background: "#FFFFFF", borderRadius: 12 }}
    >
      {routes.map((route, idx) => {
        const vehicle = vehicleById[route.vehicle_id];
        if (!vehicle || route.stops.length === 0) return null;

        const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
        const depot = { x: vehicle.depot_x, y: vehicle.depot_y };
        const stopPoints = route.stops
          .map((stop) => orderById[stop.order_id])
          .filter(Boolean)
          .map((o) => ({ x: o.x, y: o.y }));

        const fullPath = buildPath(depot, stopPoints);
        const svgPath = pointsToSvgPath(fullPath);
        const animPath = orthogonalPoints(fullPath);

        const t = (tick % loopDuration) / loopDuration;
        const vehiclePos = positionAlongPath(animPath, t);

        return (
          <g key={route.id}>
            <path
              d={svgPath}
              fill="none"
              stroke={color.band}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
            <path
              d={svgPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={0.4}
              strokeLinecap="round"
              strokeDasharray="1.5 1.5"
              opacity={0.6}
            />

            <circle cx={depot.x} cy={depot.y} r={2.2} fill={color.dark} />

            {stopPoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={1.6} fill="#FFFFFF" stroke={color.dark} strokeWidth={0.6} />
                <text x={p.x} y={p.y + 0.5} fontSize={1.6} textAnchor="middle" fill={color.dark}>
                  {i + 1}
                </text>
              </g>
            ))}

            <circle cx={vehiclePos.x} cy={vehiclePos.y} r={1.4} fill={color.dark} />
          </g>
        );
      })}
    </svg>
  );
}

export default MapView;
