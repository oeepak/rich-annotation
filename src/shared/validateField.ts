import type { FieldSchema } from "./types";

export interface ValidationResult {
  parsedValue: string | number | boolean | null;
  matched: boolean;
}

export function validateField(
  rawValue: string,
  schema: FieldSchema
): ValidationResult {
  if (rawValue === "") {
    return { parsedValue: "", matched: true };
  }

  switch (schema.type) {
    case "text":
      return { parsedValue: rawValue, matched: true };

    case "number": {
      const num = Number(rawValue);
      if (isNaN(num)) {
        return { parsedValue: null, matched: false };
      }
      return { parsedValue: num, matched: true };
    }

    case "boolean": {
      if (rawValue === "true") return { parsedValue: true, matched: true };
      if (rawValue === "false") return { parsedValue: false, matched: true };
      return { parsedValue: null, matched: false };
    }

    case "group": {
      return { parsedValue: null, matched: true };
    }

    case "select": {
      const options = schema.options ?? [];
      if (options.includes(rawValue)) {
        return { parsedValue: rawValue, matched: true };
      }
      return { parsedValue: null, matched: false };
    }

    default:
      return { parsedValue: rawValue, matched: true };
  }
}
