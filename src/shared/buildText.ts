import type { FieldSchema, FieldValues } from "./types";

export function buildText(
  fields: FieldSchema[],
  values: FieldValues
): string {
  const lines: string[] = [];

  for (const field of fields) {
    const value = values[field.name] ?? "";

    if (value === "" && !field.required) {
      continue;
    }

    // Handle multiline values: indent continuation lines with 2 spaces
    const valueLines = value.split("\n");
    lines.push(`${field.name}: ${valueLines[0]}`);
    for (let i = 1; i < valueLines.length; i++) {
      lines.push(`  ${valueLines[i]}`);
    }
  }

  return lines.join("\n");
}
