import type { FieldSchema } from "./types";

type BuildValues = Record<string, string | Record<string, string>>;

export function buildText(
  fields: FieldSchema[],
  values: BuildValues
): string {
  const blocks: string[] = [];

  for (const field of fields) {
    if (field.type === "group") {
      const children = field.children ?? [];
      const groupValues = (values[field.name] ?? {}) as Record<string, string>;

      const childLines: string[] = [];
      for (const child of children) {
        const v = groupValues[child.name] ?? "";
        if (v === "") continue;
        childLines.push(`- ${child.name}: ${v}`);
      }

      if (childLines.length === 0) continue;
      blocks.push(`${field.name}\n${childLines.join("\n")}`);
    } else {
      const value = (values[field.name] ?? "") as string;
      if (value === "") continue;
      blocks.push(`${field.name}\n- ${value}`);
    }
  }

  return blocks.join("\n\n");
}
