import type { FieldSchema, ParsedField, ParseMatch } from "./types";
import { validateField } from "./validateField";

export interface ParseResult {
  fields: ParsedField[];
  parseMatch: ParseMatch;
}

export function parseText(
  text: string,
  schemaFields: FieldSchema[]
): ParseResult {
  const fieldMap = new Map<string, string>();

  const blocks = text.split(/\n\n/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const headerMatch = lines[0]?.match(/^(?:\*\*)?(.+?)(?:\*\*)?$/);
    if (!headerMatch) continue;

    const key = headerMatch[1];
    const valueLine = lines[1] ?? "";
    const value = valueLine.replace(/^-\s?/, "").trim();
    fieldMap.set(key, value);
  }

  let allMatched = true;
  const fields: ParsedField[] = schemaFields.map((schema) => {
    const rawValue = fieldMap.get(schema.name) ?? "";
    const { parsedValue, matched } = validateField(rawValue, schema);

    if (!matched) {
      allMatched = false;
    }

    return {
      name: schema.name,
      rawValue,
      parsedValue,
      matched,
    };
  });

  return {
    fields,
    parseMatch: allMatched ? "matched" : "not_matched",
  };
}
