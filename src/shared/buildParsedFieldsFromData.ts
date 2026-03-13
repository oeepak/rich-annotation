import type { FieldData, FieldSchema, ParsedField } from "./types";
import { validateField } from "./validateField";

export function buildParsedFieldsFromData(
  data: FieldData,
  schemaFields: FieldSchema[]
): ParsedField[] {
  return schemaFields.map((schema) => {
    const raw = data[schema.name];

    if (schema.type === "group") {
      const groupData = (typeof raw === "object" ? raw : {}) as Record<string, string>;
      const children = (schema.children ?? []).map((child) => {
        const childRaw = groupData[child.name] ?? "";
        const { parsedValue, matched } = validateField(childRaw, child);
        return { name: child.name, rawValue: childRaw, parsedValue, matched };
      });
      const groupMatched = children.every((c) => c.matched);
      return {
        name: schema.name,
        rawValue: "",
        parsedValue: null,
        matched: groupMatched,
        children,
      };
    }

    const rawValue = (typeof raw === "string" ? raw : "") as string;
    const { parsedValue, matched } = validateField(rawValue, schema);
    return { name: schema.name, rawValue, parsedValue, matched };
  });
}
