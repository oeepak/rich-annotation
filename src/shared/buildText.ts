import type { FieldSchema, FieldValues } from "./types";

export function buildText(
  fields: FieldSchema[],
  values: FieldValues
): string {
  const parts: string[] = [];

  for (const field of fields) {
    const value = values[field.name] ?? "";

    if (value === "" && !field.required) {
      continue;
    }

    parts.push(`**${field.name}**\n- ${value}`);
  }

  return parts.join("\n\n");
}
