import React, { useState } from "react";

function VehicleForm({ onVehicleCreated }) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [depotX, setDepotX] = useState("");
  const [depotY, setDepotY] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/vehicles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          capacity: parseFloat(capacity),
          depot_x: parseFloat(depotX),
          depot_y: parseFloat(depotY),
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create vehicle: ${response.status}`);
      }

      const created = await response.json();
      setName("");
      setCapacity("");
      setDepotX("");
      setDepotY("");

      if (onVehicleCreated) onVehicleCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ width: "120px" }}
      />
      <input
        type="number"
        placeholder="Capacity"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        required
        style={{ width: "100px" }}
      />
      <input
        type="number"
        placeholder="Depot X"
        value={depotX}
        onChange={(e) => setDepotX(e.target.value)}
        required
        style={{ width: "90px" }}
      />
      <input
        type="number"
        placeholder="Depot Y"
        value={depotY}
        onChange={(e) => setDepotY(e.target.value)}
        required
        style={{ width: "90px" }}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add Vehicle"}
      </button>
      {error && <span style={{ color: "red", fontSize: "13px" }}>{error}</span>}
    </form>
  );
}

export default VehicleForm;
