import React from "react";
import type { AnnotationInfo } from "@shared/types";
import { postToPlugin } from "../hooks/usePluginMessage";

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  yellow: { bg: "#fef7e0", fg: "#8a6d00" },
  orange: { bg: "#fff3e0", fg: "#c65d00" },
  red: { bg: "#fce8e6", fg: "#d93025" },
  pink: { bg: "#fce4ec", fg: "#c2185b" },
  violet: { bg: "#ede7f6", fg: "#7b1fa2" },
  blue: { bg: "#e3f2fd", fg: "#1565c0" },
  teal: { bg: "#e0f2f1", fg: "#00796b" },
  green: { bg: "#e6f4ea", fg: "#1e8e3e" },
};

interface OverviewRowProps {
  annotation: AnnotationInfo;
  categoryColor?: string;
}

export function OverviewRow({ annotation, categoryColor }: OverviewRowProps) {
  const handleOpen = () => {
    postToPlugin({ type: "SELECT_NODE", nodeId: annotation.nodeId });
  };

  const colors = categoryColor ? COLOR_MAP[categoryColor] : undefined;
  const badgeStyle = colors
    ? { background: colors.bg, color: colors.fg }
    : undefined;

  return (
    <div className="row-card" onClick={handleOpen}>
      <div className="row-header">
        <span className="badge" style={badgeStyle}>
          {annotation.categoryLabel || "—"}
        </span>
        <span style={{ fontWeight: 500 }}>{annotation.nodeName}</span>
      </div>
      {annotation.label && (
        <div className="row-body">
          {annotation.label}
        </div>
      )}
    </div>
  );
}
