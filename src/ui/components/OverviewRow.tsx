import React from "react";
import type { AnnotationInfo } from "@shared/types";
import { postToPlugin } from "../hooks/usePluginMessage";

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  yellow: { bg: "#f5a623", fg: "#fff" },
  orange: { bg: "#e8601c", fg: "#fff" },
  red: { bg: "#e03e3e", fg: "#fff" },
  pink: { bg: "#d84a8a", fg: "#fff" },
  violet: { bg: "#7b61ff", fg: "#fff" },
  blue: { bg: "#0d99ff", fg: "#fff" },
  teal: { bg: "#15b8a6", fg: "#fff" },
  green: { bg: "#14ae5c", fg: "#fff" },
};

interface OverviewRowProps {
  annotation: AnnotationInfo;
  categoryColor?: string;
  onEdit: () => void;
}

export function OverviewRow({ annotation, categoryColor, onEdit }: OverviewRowProps) {

  const colors = categoryColor ? COLOR_MAP[categoryColor] : undefined;
  const badgeStyle = colors
    ? { background: colors.bg, color: colors.fg }
    : undefined;

  return (
    <div className="row-card">
      <div className="row-header">
        <span className="badge" style={badgeStyle}>
          {annotation.categoryLabel || "—"}
        </span>
        <span style={{ fontWeight: 500, flex: 1 }}>{annotation.nodeName}</span>
        <button
          className="btn btn-secondary"
          onClick={onEdit}
          style={{ padding: "2px 8px", fontSize: 10 }}
        >
          Edit
        </button>
      </div>
      {annotation.label && (
        <div className="row-body">
          {annotation.label}
        </div>
      )}
    </div>
  );
}
