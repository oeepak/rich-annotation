import React, { useState, useEffect } from "react";
import type { SchemaStore, AnnotationInfo, CategorySchema } from "@shared/types";
import { FieldInput } from "./FieldInput";
import { AnnotationPreview } from "./AnnotationPreview";
import { RawTextEditor } from "./RawTextEditor";
import { useSelectionFields } from "../hooks/useSelection";
import { postToPlugin } from "../hooks/usePluginMessage";
import type { TabId } from "./Tabs";

interface SelectedTabProps {
  nodeId: string | null;
  nodeName: string;
  nodeType: string;
  annotations: AnnotationInfo[];
  schemas: SchemaStore;
  categories: { id: string; label: string }[];
  onNavigate: (tab: TabId) => void;
}

export function SelectedTab({
  nodeId,
  nodeName,
  nodeType,
  annotations,
  schemas,
  categories,
  onNavigate,
}: SelectedTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState("");

  // Find current annotation for selected category
  const currentAnnotation = annotations.find(
    (a) => a.categoryId === selectedCategoryId
  );
  const currentLabel = currentAnnotation?.label ?? "";
  const schema: CategorySchema | undefined = schemas[selectedCategoryId];

  const { fieldValues, updateField, previewText, parsedFields, allMatched } =
    useSelectionFields({
      label: currentLabel,
      schemaFields: schema?.fields ?? [],
    });

  // Auto-select first category if available
  useEffect(() => {
    if (!selectedCategoryId && annotations.length > 0 && annotations[0].categoryId) {
      setSelectedCategoryId(annotations[0].categoryId);
    }
  }, [annotations, selectedCategoryId]);

  // Sync raw text
  useEffect(() => {
    setRawText(currentLabel);
  }, [currentLabel]);

  if (!nodeId) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div style={{ fontWeight: 600 }}>No node selected</div>
          <div>
            Select one layer, frame, or component in Figma to create or edit a
            structured annotation.
          </div>
          <div>Then choose a category and fill its schema.</div>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate("overview")}
            style={{ marginTop: 8 }}
          >
            Go to Overview
          </button>
        </div>
      </div>
    );
  }

  const handleApply = () => {
    if (!nodeId || !selectedCategoryId) return;
    const text = rawMode ? rawText : previewText;
    postToPlugin({
      type: "APPLY_ANNOTATION",
      nodeId,
      categoryId: selectedCategoryId,
      text,
    });
    setRawMode(false);
  };

  const handleDelete = () => {
    if (!nodeId || !selectedCategoryId) return;
    postToPlugin({
      type: "DELETE_ANNOTATION",
      nodeId,
      categoryId: selectedCategoryId,
    });
  };

  const handleLocate = () => {
    if (nodeId) {
      postToPlugin({ type: "SELECT_NODE", nodeId });
    }
  };

  const parseMatch = currentAnnotation?.parseMatch ?? "no_schema";
  const hasSchema = !!schema;

  return (
    <>
      <div className="tab-content">
        {/* Node Info */}
        <div className="section">
          <div style={{ fontWeight: 600 }}>{nodeName}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
            <span>{nodeType} / id: {nodeId}</span>
            <button className="btn btn-secondary" onClick={handleLocate} style={{ padding: "2px 8px", fontSize: 10 }}>
              Locate
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div className="section">
          <div className="section-label">Annotation Category</div>
          <select
            className="select"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setRawMode(false);
            }}
          >
            <option value="">— Select Category —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {selectedCategoryId && !hasSchema && (
          /* No Schema State */
          <div className="section">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No schema for this category</div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
              This category exists in Figma annotations, but Rich Annotation has
              no schema for it yet.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => onNavigate("schema")}>
                Go to Schema
              </button>
              <button className="btn btn-secondary" onClick={() => setRawMode(true)}>
                Raw Text
              </button>
            </div>
          </div>
        )}

        {selectedCategoryId && hasSchema && !rawMode && (
          <>
            {/* Schema Match Status */}
            <div className="section">
              <div className="section-label">Schema Match</div>
              <span className={`badge badge-${parseMatch.replace("_", "-")}`}>
                {parseMatch === "matched"
                  ? `Matched to ${schema.categoryLabel} schema`
                  : `Not matched to ${schema.categoryLabel} schema`}
              </span>
              {parseMatch === "not_matched" && (
                <div style={{ fontSize: 11, color: "#d93025", marginTop: 4 }}>
                  could not parse:{" "}
                  {parsedFields
                    .filter((f) => !f.matched && f.rawValue !== "")
                    .map((f) => f.name)
                    .join(", ")}
                </div>
              )}
            </div>

            {/* Field Inputs */}
            <div className="section">
              <div className="section-label">{schema.categoryLabel} Fields</div>
              {schema.fields.map((field) => {
                const parsed = parsedFields.find((p) => p.name === field.name);
                return (
                  <FieldInput
                    key={field.name}
                    schema={field}
                    value={fieldValues[field.name] ?? ""}
                    matched={parsed?.matched ?? true}
                    onChange={(v) => updateField(field.name, v)}
                  />
                );
              })}
            </div>

            {/* Preview */}
            <AnnotationPreview text={previewText} parsedFields={parsedFields} />
          </>
        )}

        {selectedCategoryId && rawMode && (
          <RawTextEditor value={rawText} onChange={setRawText} />
        )}
      </div>

      {selectedCategoryId && (
        <div className="action-bar">
          <div style={{ display: "flex", gap: 6 }}>
            {(hasSchema || rawMode) && (
              <button
                className="btn btn-secondary"
                onClick={() => setRawMode(!rawMode)}
              >
                {rawMode ? "Back to Fields" : "Edit Raw Text"}
              </button>
            )}
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      )}
    </>
  );
}
