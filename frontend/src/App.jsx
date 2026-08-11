import React, { useState } from "react";

function App() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlanRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/routes/plan", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Plan request failed: ${response.status}`);
      }
      const data = await response.json();
      setRoutes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "24px" }}>
      <h1>Delivery Route Optimization Dashboard</h1>

      <button onClick={handlePlanRoutes} disabled={loading}>
        {loading ? "Planning..." : "Plan Routes"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginTop: "24px" }}>
        {/* MapView placeholder */}
        <div style={{ border: "1px solid #ccc", minHeight: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {routes.length > 0 ? `${routes.length} routes planned` : "No routes yet"}
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        {/* MetricsPanel placeholder */}
        <p>Metrics panel coming soon</p>
      </div>
    </div>
  );
}

export default App;
