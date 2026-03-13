import { h } from 'preact';
import type { FieldSchema, FieldType } from "@shared/types";

interface SchemaFieldRowProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
}

const fieldTypes: FieldType[] = ["text", "number", "boolean", "select", "group"];

export function SchemaFieldRow({ field, onChange, onDelete }: SchemaFieldRowProps) {
  return (
    <div className="schema-field-row">
      <input
        className="input"
        placeholder="field name"
        value={field.name}
        onChange={(e) => onChange({ ...field, name: (e.target as HTMLInputElement).value })}
        style={{ flex: 2 }}
      />
      <select
        className="select"
        value={field.type}
        onChange={(e) => {
          const newType = (e.target as HTMLSelectElement).value as FieldType;
          onChange({
            ...field,
            type: newType,
            options: newType === "select" ? field.options ?? [""] : undefined,
            children: newType === "group" ? field.children ?? [{ name: "", type: "text" }] : undefined,
          });
        }}
        style={{ flex: 1 }}
      >
        {fieldTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
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
              options: (e.target as HTMLInputElement).value.split(",").map((s: string) => s.trim()).filter(Boolean),
            })
          }
          placeholder="A, B, C"
          style={{ width: "calc(100% - 60px)", display: "inline-block" }}
        />
      </div>
    );
  }

  if (field.type === "group") {
    const children = field.children ?? [];
    const childTypes: FieldType[] = ["text", "number", "boolean", "select"];

    const addChild = () => {
      onChange({
        ...field,
        children: [...children, { name: "", type: "text" }],
      });
    };

    const updateChild = (index: number, updated: FieldSchema) => {
      const newChildren = [...children];
      newChildren[index] = updated;
      onChange({ ...field, children: newChildren });
    };

    const deleteChild = (index: number) => {
      onChange({ ...field, children: children.filter((_, i) => i !== index) });
    };

    return (
      <div style={{ marginLeft: 16, marginBottom: 4, borderLeft: "2px solid #e0e0e0", paddingLeft: 8 }}>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>children:</div>
        {children.map((child, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                className="input"
                placeholder="child name"
                value={child.name}
                onChange={(e) => updateChild(i, { ...child, name: (e.target as HTMLInputElement).value })}
                style={{ flex: 2 }}
              />
              <select
                className="select"
                value={child.type}
                onChange={(e) => {
                  const t = (e.target as HTMLSelectElement).value as FieldType;
                  updateChild(i, {
                    ...child,
                    type: t,
                    options: t === "select" ? child.options ?? [""] : undefined,
                  });
                }}
                style={{ flex: 1 }}
              >
                {childTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-danger" onClick={() => deleteChild(i)} style={{ padding: "2px 6px" }}>
                ×
              </button>
            </div>
            {child.type === "select" && (
              <div style={{ marginLeft: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#999" }}>options: </span>
                <input
                  className="input"
                  value={(child.options ?? []).join(", ")}
                  onChange={(e) =>
                    updateChild(i, {
                      ...child,
                      options: (e.target as HTMLInputElement).value.split(",").map((s: string) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="A, B, C"
                  style={{ width: "calc(100% - 60px)", display: "inline-block" }}
                />
              </div>
            )}
          </div>
        ))}
        <button
          className="btn btn-secondary"
          onClick={addChild}
          style={{ fontSize: 10, padding: "2px 8px" }}
        >
          + Child
        </button>
      </div>
    );
  }

  return null;
}
