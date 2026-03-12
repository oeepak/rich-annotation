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

  return (
    <div className="row-card" onClick={handleOpen}>
      <div className="row-header">
        <span className="badge badge-category">
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
