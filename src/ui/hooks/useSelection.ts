import { useState, useEffect } from "react";
import type { FieldSchema, FieldValues, ParsedField } from "@shared/types";
import { buildText } from "@shared/buildText";
import { parseText } from "@shared/parseText";
import { validateField } from "@shared/validateField";

interface UseSelectionFieldsOptions {
  label: string;
  schemaFields: FieldSchema[];
}

export function useSelectionFields({ label, schemaFields }: UseSelectionFieldsOptions) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [validations, setValidations] = useState<Map<string, boolean>>(new Map());

  // Initialize field values from parsed annotation text
  useEffect(() => {
    if (schemaFields.length === 0) return;

    const result = parseText(label, schemaFields);
    const values: FieldValues = {};
    const valMap = new Map<string, boolean>();

    for (const f of result.fields) {
      values[f.name] = f.rawValue;
      valMap.set(f.name, f.matched);
    }

    setFieldValues(values);
    setValidations(valMap);
  }, [label, schemaFields]);

  const updateField = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));

    const schema = schemaFields.find((f) => f.name === name);
    if (schema) {
      const { matched } = validateField(value, schema);
      setValidations((prev) => new Map(prev).set(name, matched));
    }
  };

  const previewText = buildText(schemaFields, fieldValues);

  const parsedFields: ParsedField[] = schemaFields.map((s) => {
    const raw = fieldValues[s.name] ?? "";
    const { parsedValue, matched } = validateField(raw, s);
    return { name: s.name, rawValue: raw, parsedValue, matched };
  });

  const allMatched = parsedFields.every((f) => f.matched);

  return {
    fieldValues,
    updateField,
    previewText,
    parsedFields,
    allMatched,
  };
}
