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
  const lineMap = new Map<string, string>();
  let lastKey = "";

  for (const line of text.split("\n")) {
    // Continuation line: starts with whitespace
    if (line.match(/^\s/) && lastKey) {
      const existing = lineMap.get(lastKey) ?? "";
      lineMap.set(lastKey, existing + "\n" + line.replace(/^\s{1,2}/, ""));
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    lineMap.set(key, value);
    lastKey = key;
  }

  let allMatched = true;
  const fields: ParsedField[] = schemaFields.map((schema) => {
    const rawValue = lineMap.get(schema.name) ?? "";
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
