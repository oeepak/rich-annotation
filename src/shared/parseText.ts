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
  // Split text into blocks separated by blank lines
  const blocks = text.split(/\n\n+/).filter((b) => b.trim() !== "");

  // Map block header (field name) → body lines starting with "- "
  const blockMap = new Map<string, string[]>();
  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0].trim();
    const bodyLines = lines.slice(1).filter((l) => l.startsWith("- "));
    blockMap.set(header, bodyLines);
  }

  let allMatched = true;
  const fields: ParsedField[] = schemaFields.map((schema) => {
    const bodyLines = blockMap.get(schema.name);

    if (!bodyLines || bodyLines.length === 0) {
      if (schema.required) {
        allMatched = false;
        return { name: schema.name, rawValue: "", parsedValue: null, matched: false };
      }
      return { name: schema.name, rawValue: "", parsedValue: "", matched: true };
    }

    if (schema.type === "group") {
      const children = schema.children ?? [];
      const childMap = new Map<string, string>();
      for (const line of bodyLines) {
        const content = line.slice(2); // remove "- "
        const colonIdx = content.indexOf(":");
        if (colonIdx === -1) continue;
        const key = content.slice(0, colonIdx).trim();
        const val = content.slice(colonIdx + 1).trim();
        childMap.set(key, val);
      }

      let groupMatched = true;
      const parsedChildren: ParsedField[] = children.map((child) => {
        const raw = childMap.get(child.name) ?? "";
        const { parsedValue, matched } = validateField(raw, child);
        if (!matched) groupMatched = false;
        return { name: child.name, rawValue: raw, parsedValue, matched };
      });

      if (!groupMatched) allMatched = false;

      return {
        name: schema.name,
        rawValue: bodyLines.map((l) => l.slice(2)).join("\n"),
        parsedValue: null,
        matched: groupMatched,
        children: parsedChildren,
      };
    }

    // Flat field: single "- value" line
    const rawValue = bodyLines[0]?.slice(2) ?? "";
    const { parsedValue, matched } = validateField(rawValue, schema);
    if (!matched) allMatched = false;

    return { name: schema.name, rawValue, parsedValue, matched };
  });

  return { fields, parseMatch: allMatched ? "matched" : "not_matched" };
}
