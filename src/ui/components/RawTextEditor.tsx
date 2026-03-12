import React from "react";

interface RawTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RawTextEditor({ value, onChange }: RawTextEditorProps) {
  return (
    <div className="section">
      <div className="section-label">Raw Text Mode</div>
      <textarea
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        style={{ fontFamily: "monospace", fontSize: 11 }}
      />
      <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
        Leave raw text as-is or apply schema parsing.
      </div>
    </div>
  );
}
