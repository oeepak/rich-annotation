import { describe, it, expect } from "vitest";
import { parseText } from "../src/shared/parseText";
import type { FieldSchema, ParseMatch } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("parseText", () => {
  it("parses valid canonical text as matched", () => {
    const text =
      "experiment_id: paywall_copy_test\nvariant: B\nsurface: pricing_modal\nenabled: true";
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
    const text = "experiment_id: test\nvariant: hoho";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const variantField = result.fields.find((f) => f.name === "variant");
    expect(variantField?.matched).toBe(false);
    expect(variantField?.rawValue).toBe("hoho");
    expect(variantField?.parsedValue).toBeNull();
  });

  it("returns field values as empty string when line is missing and optional", () => {
    const text = "experiment_id: test\nvariant: A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    const surfaceField = result.fields.find((f) => f.name === "surface");
    expect(surfaceField?.rawValue).toBe("");
    expect(surfaceField?.matched).toBe(true);
  });

  it("marks missing required field as not matched", () => {
    const text = "variant: A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.matched).toBe(false);
  });

  it("handles values with colons", () => {
    const text = "experiment_id: url:test:123\nvariant: A";
    const result = parseText(text, experimentFields);
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.rawValue).toBe("url:test:123");
  });

  it("parses multiline values with indentation continuation", () => {
    const fields: FieldSchema[] = [
      { name: "note", type: "text", required: false, multiline: true },
      { name: "owner", type: "text", required: false },
    ];
    const text = "note: line one\n  line two\n  line three\nowner: alice";
    const result = parseText(text, fields);
    expect(result.parseMatch).toBe("matched");
    const noteField = result.fields.find((f) => f.name === "note");
    expect(noteField?.rawValue).toBe("line one\nline two\nline three");
    const ownerField = result.fields.find((f) => f.name === "owner");
    expect(ownerField?.rawValue).toBe("alice");
  });

  it("returns field values from raw text even with extra whitespace", () => {
    const text = "experiment_id:   paywall  \nvariant:B";
    const result = parseText(text, experimentFields);
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.rawValue).toBe("paywall");
    const variantField = result.fields.find((f) => f.name === "variant");
    expect(variantField?.rawValue).toBe("B");
  });
});
