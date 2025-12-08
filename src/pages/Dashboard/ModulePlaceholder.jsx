// src/pages/Dashboard/ModulePlaceholder.jsx
import React from "react";

export default function ModulePlaceholder({
  title = "Module",
  description = `Placeholder content for ${title} module.`,
  icon = "📄",
}) {
  return (
    <div
      className="card"
      style={{
        padding: "24px",
        textAlign: "center",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>

      <h2 style={{ margin: "0 0 8px" }}>{title}</h2>

      <p className="small-muted" style={{ maxWidth: 500, margin: "0 auto" }}>
        {description}
      </p>
    </div>
  );
}
