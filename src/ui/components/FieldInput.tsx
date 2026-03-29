import { h } from 'preact';
import { Textbox, TextboxNumeric, Dropdown, Checkbox } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";
import type { FieldSchema } from "@shared/types";
import styles from "../styles";

interface FieldInputProps {
  schema: FieldSchema;
  value: string;
  matched: boolean;
  onChange: (value: string) => void;
}

interface GroupFieldInputProps {
  schema: FieldSchema;
  values: Record<string, string>;
  childMatches: Record<string, boolean>;
  onChildChange: (childName: string, value: string) => void;
}

export function FieldInput({ schema, value, matched, onChange }: FieldInputProps) {
  const showError = !matched && value !== "";

  if (schema.type === "select") {
    const options: DropdownOption[] = [
      { value: "" },
      ...(schema.options ?? []).map((opt) => ({ value: opt, text: opt })),
    ];
    return (
      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>
          {schema.name}
        </div>
        <Dropdown value={value || null} options={options} onValueChange={(val) => onChange(val)} placeholder="—" />
        {showError && (
          <div style={{ color: "#f24822", fontSize: 10, marginTop: 2 }}>
            Not a valid option
          </div>
        )}
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className={styles.fieldGroup}>
        <Checkbox value={value === "true"} onValueChange={(val: boolean) => onChange(val ? "true" : "false")}>
          {schema.name}
        </Checkbox>
      </div>
    );
  }

  if (schema.type === "number") {
    return (
      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>
          {schema.name}
        </div>
        <TextboxNumeric value={value} onValueInput={(val) => onChange(val)} />
        {showError && (
          <div style={{ color: "#f24822", fontSize: 10, marginTop: 2 }}>
            Type mismatch
          </div>
        )}
      </div>
    );
  }

  // text (default)
  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldLabel}>
        {schema.name}
      </div>
      <Textbox value={value} onValueInput={(val) => onChange(val)} />
      {showError && (
        <div style={{ color: "#f24822", fontSize: 10, marginTop: 2 }}>
          Type mismatch
        </div>
      )}
    </div>
  );
}

export function GroupFieldInput({ schema, values, childMatches, onChildChange }: GroupFieldInputProps) {
  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldLabel}>
        {schema.name}
      </div>
      <div style={{ marginLeft: 12 }}>
        {(schema.children ?? []).map((child) => (
          <FieldInput
            key={child.name}
            schema={child}
            value={values[child.name] ?? ""}
            matched={childMatches[child.name] ?? true}
            onChange={(v) => onChildChange(child.name, v)}
          />
        ))}
      </div>
    </div>
  );
}
