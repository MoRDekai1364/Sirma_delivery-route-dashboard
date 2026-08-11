import React, { useState } from "react";
import MapView from "./components/MapView/MapView.jsx";

function App() {
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlanRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, vehiclesRes, ordersRes] = await Promise.all([
        fetch("/api/routes/plan", { method: "POST" }),
        fetch("/api/vehicles/"),
        fetch("/api/orders/"),
      ]);

      if (!planRes.ok) throw new Error(`Plan request failed: ${planRes.status}`);
      if (!vehiclesRes.ok) throw new Error(`Vehicles request failed: ${vehiclesRes.status}`);
      if (!ordersRes.ok) throw new Error(`Orders request failed: ${ordersRes.status}`);

      const planData = await planRes.json();
      const vehiclesData = await vehiclesRes.json();
      const ordersData = await ordersRes.json();

      setRoutes(planData);
      setVehicles(vehiclesData);
      setOrders(ordersData);
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
        <MapView routes={routes} vehicles={vehicles} orders={orders} />
      </div>

      <div style={{ marginTop: "24px" }}>
        {/* MetricsPanel placeholder */}
        <p>Metrics panel coming soon</p>
      </div>
    </div>
  );
}

export default App;
