import { h } from 'preact';
import { Button } from "@create-figma-plugin/ui";
import type { CategorySchema, FieldSchema } from "@shared/types";
import { SchemaFieldRow, FieldOptionsEditor } from "./SchemaFieldRow";
import styles from "../styles";

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
    <div className={styles.schemaCategory}>
      <div className={styles.schemaCategoryHeader}>
        <strong>{schema.categoryLabel}</strong>
        <Button secondary onClick={addField}>+ Add</Button>
      </div>
      {schema.fields.map((field, i) => (
        <div key={i}>
          <SchemaFieldRow
            field={field}
            onChange={(f) => updateField(i, f)}
            onDelete={() => deleteField(i)}
          />
          <FieldOptionsEditor
            field={field}
            onChange={(f) => updateField(i, f)}
          />
        </div>
      ))}
      {schema.fields.length === 0 && (
        <div style={{ fontSize: 11, color: "#999", padding: 8 }}>
          No fields. Click + Add to define schema fields.
        </div>
      )}
    </div>
  );
}
