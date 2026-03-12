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
  it("parses valid canonical text as matched", () => {
    const text = "experiment_id: paywall_copy_test\nvariant: B\nsurface: pricing_modal\nenabled: true";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[0]).toEqual({ name: "experiment_id", rawValue: "paywall_copy_test", parsedValue: "paywall_copy_test", matched: true });
    expect(result.fields[3]).toEqual({ name: "enabled", rawValue: "true", parsedValue: true, matched: true });
  });

  it("returns not_matched when select value is invalid", () => {
    const text = "experiment_id: test\nvariant: hoho";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    expect(result.fields.find((f) => f.name === "variant")?.matched).toBe(false);
  });

  it("returns empty string for missing optional fields", () => {
    const text = "experiment_id: test\nvariant: A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields.find((f) => f.name === "surface")?.rawValue).toBe("");
  });

  it("marks missing required field as not matched", () => {
    const text = "variant: A";
    expect(parseText(text, experimentFields).parseMatch).toBe("not_matched");
  });

  it("handles values with colons", () => {
    const text = "experiment_id: url:test:123\nvariant: A";
    expect(parseText(text, experimentFields).fields.find((f) => f.name === "experiment_id")?.rawValue).toBe("url:test:123");
  });
});
