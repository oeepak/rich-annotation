import { describe, it, expect } from "vitest";
import { parseText } from "../src/shared/parseText";
import type { FieldSchema } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("parseText", () => {
  it("parses valid markdown text as matched", () => {
    const text =
      "experiment_id\n- paywall_copy_test\n\nvariant\n- B\n\nsurface\n- pricing_modal\n\nenabled\n- true";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields).toHaveLength(4);
    expect(result.fields[0]).toEqual({
      name: "experiment_id",
      rawValue: "paywall_copy_test",
      parsedValue: "paywall_copy_test",
      matched: true,
    });
    expect(result.fields[3]).toEqual({
      name: "enabled",
      rawValue: "true",
      parsedValue: true,
      matched: true,
    });
  });

  it("returns not_matched when select value is invalid", () => {
    const text = "experiment_id\n- test\n\nvariant\n- hoho";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const variantField = result.fields.find((f) => f.name === "variant");
    expect(variantField?.matched).toBe(false);
    expect(variantField?.rawValue).toBe("hoho");
  });

  it("returns empty string for missing optional fields", () => {
    const text = "experiment_id\n- test\n\nvariant\n- A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    const surfaceField = result.fields.find((f) => f.name === "surface");
    expect(surfaceField?.rawValue).toBe("");
    expect(surfaceField?.matched).toBe(true);
  });

  it("marks missing required field as not matched", () => {
    const text = "variant\n- A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.matched).toBe(false);
  });
});
