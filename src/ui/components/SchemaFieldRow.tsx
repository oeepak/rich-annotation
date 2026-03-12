import React from "react";
import type { FieldSchema, FieldType } from "@shared/types";

interface SchemaFieldRowProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
}

const fieldTypes: FieldType[] = ["text", "number", "boolean", "select"];

export function SchemaFieldRow({ field, onChange, onDelete }: SchemaFieldRowProps) {
  return (
    <div className="schema-field-row">
      <input
        className="input"
        placeholder="field name"
        value={field.name}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        style={{ flex: 2 }}
      />
      <select
        className="select"
        value={field.type}
        onChange={(e) =>
          onChange({
            ...field,
            type: e.target.value as FieldType,
            options: e.target.value === "select" ? field.options ?? [""] : undefined,
            multiline: e.target.value === "text" ? field.multiline : undefined,
          })
        }
        style={{ flex: 1 }}
      >
        {fieldTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
        req
      </label>
      <button className="btn btn-danger" onClick={onDelete} style={{ padding: "2px 6px" }}>
        ×
      </button>
    </div>
  );
}

interface FieldOptionsEditorProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
}

export function FieldOptionsEditor({ field, onChange }: FieldOptionsEditorProps) {
  if (field.type === "select") {
    return (
      <div style={{ marginLeft: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#999" }}>options: </span>
        <input
          className="input"
          value={(field.options ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...field,
              options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="A, B, C"
          style={{ width: "calc(100% - 60px)", display: "inline-block" }}
        />
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div style={{ marginLeft: 8, marginBottom: 4 }}>
        <label style={{ fontSize: 10, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={field.multiline ?? false}
            onChange={(e) => onChange({ ...field, multiline: e.target.checked })}
          />
          multiline input
        </label>
      </div>
    );
  }

  return null;
}
