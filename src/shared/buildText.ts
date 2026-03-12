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

    lines.push(`${field.name}: ${value}`);
  }

  return lines.join("\n");
}
