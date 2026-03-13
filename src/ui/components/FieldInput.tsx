import React from "react";
import type { FieldSchema } from "@shared/types";

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
  const errorClass = !matched && value !== "" ? " error" : "";

  if (schema.type === "select") {
    return (
      <div className="field-group">
        <div className="field-label">
          {schema.name}
          {schema.required && <span className="required"> *</span>}
        </div>
        <select
          className={`select${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(schema.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="field-group">
        <div className="field-label">
          {schema.name}
          {schema.required && <span className="required"> *</span>}
        </div>
        <select
          className={`select${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  // text or number
  return (
    <div className="field-group">
      <div className="field-label">
        {schema.name}
        {schema.required && <span className="required"> *</span>}
      </div>
      <input
        className={`input${errorClass}`}
        type={schema.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function GroupFieldInput({ schema, values, childMatches, onChildChange }: GroupFieldInputProps) {
  return (
    <div className="field-group">
      <div className="field-label">
        {schema.name}
        {schema.required && <span className="required"> *</span>}
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
