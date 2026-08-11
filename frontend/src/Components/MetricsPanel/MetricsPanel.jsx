import React from "react";

function MetricsPanel({ routes, vehicles, orders }) {
  if (!routes || routes.length === 0) {
    return (
      <div style={{ color: "#888780" }}>No metrics yet — plan routes first.</div>
    );
  }

  const vehicleById = Object.fromEntries((vehicles || []).map((v) => [v.id, v]));
  const orderById = Object.fromEntries((orders || []).map((o) => [o.id, o]));

  const totalDistance = routes.reduce((sum, r) => sum + r.total_distance, 0);
  const servedCount = (orders || []).filter((o) => o.status === "assigned").length;
  const unservedCount = (orders || []).filter((o) => o.status === "unserved").length;
  const pendingCount = (orders || []).filter((o) => o.status === "pending").length;

  const vehicleStats = routes
    .map((route) => {
      const vehicle = vehicleById[route.vehicle_id];
      if (!vehicle) return null;

      const usedVolume = route.stops.reduce((sum, stop) => {
        const order = orderById[stop.order_id];
        return sum + (order ? order.volume : 0);
      }, 0);

      const loadPercent = vehicle.capacity > 0
        ? Math.round((usedVolume / vehicle.capacity) * 100)
        : 0;

      return {
        id: vehicle.id,
        name: vehicle.name,
        stopCount: route.stops.length,
        distance: route.total_distance,
        loadPercent,
      };
    })
    .filter(Boolean);

  return (
    <div>
      <h3 style={{ marginBottom: "8px" }}>Metrics</h3>

      <div style={{ display: "flex", gap: "24px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#888780" }}>Total distance</div>
          <div style={{ fontSize: "20px", fontWeight: 500 }}>{totalDistance.toFixed(1)}</div>
        </div>
        <div>
          <div style={{ fontSize: "13px", color: "#888780" }}>Served</div>
          <div style={{ fontSize: "20px", fontWeight: 500 }}>{servedCount}</div>
        </div>
        <div>
          <div style={{ fontSize: "13px", color: "#888780" }}>Unserved</div>
          <div style={{ fontSize: "20px", fontWeight: 500, color: unservedCount > 0 ? "#D85A30" : undefined }}>
            {unservedCount}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "13px", color: "#888780" }}>Pending</div>
          <div style={{ fontSize: "20px", fontWeight: 500 }}>{pendingCount}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Vehicle</th>
            <th style={{ padding: "6px 8px" }}>Stops</th>
            <th style={{ padding: "6px 8px" }}>Distance</th>
            <th style={{ padding: "6px 8px" }}>Load</th>
          </tr>
        </thead>
        <tbody>
          {vehicleStats.map((v) => (
            <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 8px" }}>{v.name}</td>
              <td style={{ padding: "6px 8px" }}>{v.stopCount}</td>
              <td style={{ padding: "6px 8px" }}>{v.distance.toFixed(1)}</td>
              <td style={{ padding: "6px 8px" }}>{v.loadPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MetricsPanel;
