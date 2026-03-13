import { useState, useEffect } from "preact/hooks";
import type { FieldSchema, FieldData, ParsedField } from "../../shared/types";
import { buildText } from "../../shared/buildText";
import { parseText } from "../../shared/parseText";
import { validateField } from "../../shared/validateField";

interface UseSelectionFieldsOptions {
  label: string;
  fieldData?: FieldData;
  schemaFields: FieldSchema[];
}

type GroupValues = Record<string, string>;
type AllFieldValues = Record<string, string | GroupValues>;

export function useSelectionFields({ label, fieldData, schemaFields }: UseSelectionFieldsOptions) {
  const [fieldValues, setFieldValues] = useState<AllFieldValues>({});

  // Initialize field values from fieldData (preferred) or parsed label (fallback)
  useEffect(() => {
    if (schemaFields.length === 0) return;

    if (fieldData) {
      const values: AllFieldValues = {};
      for (const schema of schemaFields) {
        if (schema.type === "group") {
          const groupData = (typeof fieldData[schema.name] === "object"
            ? fieldData[schema.name]
            : {}) as GroupValues;
          values[schema.name] = { ...groupData };
        } else {
          values[schema.name] = (typeof fieldData[schema.name] === "string"
            ? fieldData[schema.name]
            : "") as string;
        }
      }
      setFieldValues(values);
    } else {
      const result = parseText(label, schemaFields);
      const values: AllFieldValues = {};
      for (const f of result.fields) {
        if (f.children) {
          const group: GroupValues = {};
          for (const child of f.children) {
            group[child.name] = child.rawValue;
          }
          values[f.name] = group;
        } else {
          values[f.name] = f.rawValue;
        }
      }
      setFieldValues(values);
    }
  }, [label, fieldData, schemaFields]);

  const updateField = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const updateGroupField = (groupName: string, childName: string, value: string) => {
    setFieldValues((prev) => {
      const group = (typeof prev[groupName] === "object" ? prev[groupName] : {}) as GroupValues;
      return { ...prev, [groupName]: { ...group, [childName]: value } };
    });
  };

  const previewText = buildText(schemaFields, fieldValues);

  const currentFieldData: FieldData = {};
  for (const schema of schemaFields) {
    currentFieldData[schema.name] = fieldValues[schema.name] ?? (schema.type === "group" ? {} : "");
  }

  const parsedFields: ParsedField[] = schemaFields.map((s) => {
    if (s.type === "group") {
      const groupValues = (typeof fieldValues[s.name] === "object"
        ? fieldValues[s.name]
        : {}) as GroupValues;
      const children: ParsedField[] = (s.children ?? []).map((child) => {
        const raw = groupValues[child.name] ?? "";
        const { parsedValue, matched } = validateField(raw, child);
        return { name: child.name, rawValue: raw, parsedValue, matched };
      });
      const groupMatched = children.every((c) => c.matched);
      return { name: s.name, rawValue: "", parsedValue: null, matched: groupMatched, children };
    }

    const raw = (fieldValues[s.name] ?? "") as string;
    const { parsedValue, matched } = validateField(raw, s);
    return { name: s.name, rawValue: raw, parsedValue, matched };
  });

  const allMatched = parsedFields.every((f) => f.matched);

  return {
    fieldValues,
    updateField,
    updateGroupField,
    previewText,
    currentFieldData,
    parsedFields,
    allMatched,
  };
}
