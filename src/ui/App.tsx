import React, { useState, useCallback } from "react";
import { OverviewTab } from "./components/OverviewTab";
import { SelectedTab } from "./components/SelectedTab";
import { SchemaTab } from "./components/SchemaTab";
import { usePluginMessage, postToPlugin } from "./hooks/usePluginMessage";
import type { PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo } from "@shared/types";

type View = "auto" | "schema";

export function App() {
  const [view, setView] = useState<View>("auto");
  const [schemas, setSchemas] = useState<SchemaStore>({});
  const [categories, setCategories] = useState<{ id: string; label: string; color: string }[]>([]);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState("");
  const [selectedAnnotations, setSelectedAnnotations] = useState<AnnotationInfo[]>([]);

  // Overview state
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationInfo[]>([]);

  const handleMessage = useCallback((msg: PluginMessage) => {
    switch (msg.type) {
      case "SELECTION_CHANGED":
        setSelectedNodeId(msg.nodeId);
        setSelectedNodeName(msg.nodeName);
        setSelectedNodeType(msg.nodeType);
        setSelectedAnnotations(msg.annotations);
        setView("auto");
        // Refresh overview annotations
        postToPlugin({ type: "GET_ANNOTATIONS" });
        break;
      case "SCHEMAS_LOADED":
        setSchemas(msg.schemas);
        break;
      case "ANNOTATIONS_LIST":
        setPageAnnotations(msg.annotations);
        break;
      case "CATEGORIES_LIST":
        setCategories(msg.categories);
        break;
      case "ANNOTATION_APPLIED":
      case "ANNOTATION_DELETED":
        postToPlugin({ type: "GET_ANNOTATIONS" });
        break;
    }
  }, []);

  usePluginMessage(handleMessage);

  const goToSchema = () => {
    postToPlugin({ type: "GET_SCHEMAS" });
    postToPlugin({ type: "GET_CATEGORIES" });
    setView("schema");
  };

  const goBack = () => {
    setView("auto");
  };

  // Schema view
  if (view === "schema") {
    return (
      <div className="plugin-container">
        <SchemaTab
          schemas={schemas}
          categories={categories}
          onBack={goBack}
        />
      </div>
    );
  }

  // Auto view: no selection → overview, selection → selected
  if (!selectedNodeId) {
    return (
      <div className="plugin-container">
        <OverviewTab
          annotations={pageAnnotations}
          schemas={schemas}
          categories={categories}
          onEdit={(nodeId) => {
            postToPlugin({ type: "SELECT_NODE", nodeId });
          }}
        />
      </div>
    );
  }

  return (
    <div className="plugin-container">
      <SelectedTab
        nodeId={selectedNodeId}
        nodeName={selectedNodeName}
        nodeType={selectedNodeType}
        annotations={selectedAnnotations}
        schemas={schemas}
        categories={categories}
        onGoToSchema={goToSchema}
      />
    </div>
  );
}
