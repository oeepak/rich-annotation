import React from "react";
import type { CategorySchema, FieldSchema } from "@shared/types";
import { SchemaFieldRow } from "./SchemaFieldRow";

interface SchemaCategoryProps {
  schema: CategorySchema;
  onChange: (updated: CategorySchema) => void;
}

export function SchemaCategory({ schema, onChange }: SchemaCategoryProps) {
  const addField = () => {
    onChange({
      ...schema,
      fields: [
        ...schema.fields,
        { name: "", type: "text" },
      ],
    });
  };

  const updateField = (index: number, updated: FieldSchema) => {
    const fields = [...schema.fields];
    fields[index] = updated;
    onChange({ ...schema, fields });
  };

  const deleteField = (index: number) => {
    const fields = schema.fields.filter((_, i) => i !== index);
    onChange({ ...schema, fields });
  };

  return (
    <div className="schema-category">
      <div className="schema-category-header">
        <strong>{schema.categoryLabel}</strong>
        <button className="btn btn-secondary" onClick={addField}>
          + Add
        </button>
      </div>
      {schema.fields.map((field, i) => (
        <SchemaFieldRow
          key={i}
          field={field}
          onChange={(f) => updateField(i, f)}
          onDelete={() => deleteField(i)}
        />
      ))}
      {schema.fields.length === 0 && (
        <div style={{ fontSize: 11, color: "#999", padding: 8 }}>
          No fields. Click + Add to define schema fields.
        </div>
      )}
    </div>
  );
}
