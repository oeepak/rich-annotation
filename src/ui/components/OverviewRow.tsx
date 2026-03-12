import React from "react";
import type { AnnotationInfo } from "@shared/types";
import { postToPlugin } from "../hooks/usePluginMessage";

interface OverviewRowProps {
  annotation: AnnotationInfo;
}

export function OverviewRow({ annotation }: OverviewRowProps) {
  const handleOpen = () => {
    postToPlugin({ type: "SELECT_NODE", nodeId: annotation.nodeId });
  };

  // Show first 2 parsed fields, or fallback to first line of raw text
  const summaryFields = annotation.parsedFields
    .filter((f) => f.rawValue !== "")
    .slice(0, 2);

  const fallbackLine =
    summaryFields.length === 0 ? annotation.label.split("\n")[0] : null;

  return (
    <div className="row-card" onClick={handleOpen}>
      <div className="row-header">
        <span className={`badge badge-${(annotation.parseMatch ?? "no-schema").replace("_", "-")}`}>
          {annotation.categoryLabel || "—"}
        </span>
        <span style={{ fontWeight: 500 }}>{annotation.nodeName}</span>
      </div>
      <div className="row-fields">
        {summaryFields.map((f) => (
          <div key={f.name}>
            {f.name}: {f.rawValue}
          </div>
        ))}
        {fallbackLine && <div>{fallbackLine}</div>}
      </div>
    </div>
  );
}
