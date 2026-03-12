import React, { useState, useCallback } from "react";
import { Tabs, TabId } from "./components/Tabs";
import { OverviewTab } from "./components/OverviewTab";
import { SelectedTab } from "./components/SelectedTab";
import { SchemaTab } from "./components/SchemaTab";
import { usePluginMessage, postToPlugin } from "./hooks/usePluginMessage";
import type { PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo } from "@shared/types";

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("selected");
  const [schemas, setSchemas] = useState<SchemaStore>({});
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);

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

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "overview") {
      postToPlugin({ type: "GET_ANNOTATIONS" });
    } else if (tab === "selected") {
      postToPlugin({ type: "GET_SELECTION" });
    } else if (tab === "schema") {
      postToPlugin({ type: "GET_SCHEMAS" });
      postToPlugin({ type: "GET_CATEGORIES" });
    }
  };

  return (
    <div className="plugin-container">
      <Tabs active={activeTab} onChange={handleTabChange} />
      {activeTab === "overview" && (
        <OverviewTab
          annotations={pageAnnotations}
          schemas={schemas}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}
      {activeTab === "selected" && (
        <SelectedTab
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          nodeType={selectedNodeType}
          annotations={selectedAnnotations}
          schemas={schemas}
          categories={categories}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}
      {activeTab === "schema" && (
        <SchemaTab
          schemas={schemas}
          categories={categories}
        />
      )}
    </div>
  );
}
