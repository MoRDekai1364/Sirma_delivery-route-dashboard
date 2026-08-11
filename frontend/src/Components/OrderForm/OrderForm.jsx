import React, { useState } from "react";

function OrderForm({ onOrderCreated }) {
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [volume, setVolume] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x: parseFloat(x),
          y: parseFloat(y),
          volume: parseFloat(volume),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.status}`);
      }

      const created = await response.json();
      setX("");
      setY("");
      setVolume("");

      if (onOrderCreated) onOrderCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="number"
        placeholder="X"
        value={x}
        onChange={(e) => setX(e.target.value)}
        required
        style={{ width: "80px" }}
      />
      <input
        type="number"
        placeholder="Y"
        value={y}
        onChange={(e) => setY(e.target.value)}
        required
        style={{ width: "80px" }}
      />
      <input
        type="number"
        placeholder="Volume"
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
        required
        style={{ width: "100px" }}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add Order"}
      </button>
      {error && <span style={{ color: "red", fontSize: "13px" }}>{error}</span>}
    </form>
  );
}

export default OrderForm;
