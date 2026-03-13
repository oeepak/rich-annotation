import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { SchemaStore, AnnotationInfo, CategorySchema } from "@shared/types";
import { FieldInput, GroupFieldInput } from "./FieldInput";
import { AnnotationPreview } from "./AnnotationPreview";
import { RawTextEditor } from "./RawTextEditor";
import { useSelectionFields } from "../hooks/useSelection";
import { postToPlugin } from "../hooks/usePluginMessage";

interface SelectedTabProps {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  annotations: AnnotationInfo[];
  schemas: SchemaStore;
  categories: { id: string; label: string; color: string }[];
  onGoToSchema: () => void;
}

export function SelectedTab({
  nodeId,
  nodeName,
  nodeType,
  annotations,
  schemas,
  categories,
  onGoToSchema,
}: SelectedTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState("");

  const currentAnnotation = annotations.find(
    (a) => a.categoryId === selectedCategoryId
  );
  const currentLabel = currentAnnotation?.label ?? "";
  const schema: CategorySchema | undefined = schemas[selectedCategoryId];

  const { fieldValues, updateField, updateGroupField, previewText, currentFieldData, parsedFields, allMatched } =
    useSelectionFields({
      label: currentLabel,
      fieldData: currentAnnotation?.fieldData,
      schemaFields: schema?.fields ?? [],
    });

  useEffect(() => {
    if (!selectedCategoryId && annotations.length > 0 && annotations[0].categoryId) {
      setSelectedCategoryId(annotations[0].categoryId);
    }
  }, [annotations, selectedCategoryId]);

  useEffect(() => {
    setRawText(currentLabel);
  }, [currentLabel]);

  const handleApply = () => {
    if (!nodeId || !selectedCategoryId) return;
    const text = rawMode ? rawText : previewText;
    postToPlugin({
      type: "APPLY_ANNOTATION",
      nodeId,
      categoryId: selectedCategoryId,
      text,
      fieldData: currentFieldData,
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

  const parseMatch = currentAnnotation?.parseMatch ?? "no_schema";
  const hasSchema = !!schema;

  return (
    <>
      <div className="tab-content">
        {/* Node Info */}
        <div className="section">
          <div style={{ fontWeight: 600 }}>{nodeName}</div>
          <div style={{ fontSize: 11, color: "#999" }}>
            {nodeType} / {nodeId}
          </div>
        </div>

        {/* Category Selection */}
        <div className="section">
          <div className="section-label">Category</div>
          <select
            className="select"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId((e.target as HTMLSelectElement).value);
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
          <div className="section">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No schema for this category</div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
              Define a schema to use structured fields.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={onGoToSchema}>
                Schema
              </button>
              <button className="btn btn-secondary" onClick={() => setRawMode(true)}>
                Raw Text
              </button>
            </div>
          </div>
        )}

        {selectedCategoryId && hasSchema && !rawMode && (
          <>
            {parseMatch === "not_matched" && (
              <div className="section">
                <span className="badge badge-not-matched">
                  Not matched
                </span>
                <div style={{ fontSize: 11, color: "#d93025", marginTop: 4 }}>
                  could not parse:{" "}
                  {parsedFields
                    .filter((f) => !f.matched && f.rawValue !== "")
                    .map((f) => f.name)
                    .join(", ")}
                </div>
              </div>
            )}

            {/* Field Inputs */}
            <div className="section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="section-label">Fields</div>
                <button className="btn btn-secondary" onClick={onGoToSchema} style={{ padding: "2px 8px", fontSize: 10 }}>
                  Schema
                </button>
              </div>
              {schema.fields.map((field) => {
                const parsed = parsedFields.find((p) => p.name === field.name);

                if (field.type === "group") {
                  const groupValues = (typeof fieldValues[field.name] === "object"
                    ? fieldValues[field.name]
                    : {}) as Record<string, string>;
                  const childMatches: Record<string, boolean> = {};
                  for (const child of parsed?.children ?? []) {
                    childMatches[child.name] = child.matched;
                  }
                  return (
                    <GroupFieldInput
                      key={field.name}
                      schema={field}
                      values={groupValues}
                      childMatches={childMatches}
                      onChildChange={(childName, v) => updateGroupField(field.name, childName, v)}
                    />
                  );
                }

                return (
                  <FieldInput
                    key={field.name}
                    schema={field}
                    value={(fieldValues[field.name] ?? "") as string}
                    matched={parsed?.matched ?? true}
                    onChange={(v) => updateField(field.name, v)}
                  />
                );
              })}
            </div>

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
                {rawMode ? "Fields" : "Raw"}
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
