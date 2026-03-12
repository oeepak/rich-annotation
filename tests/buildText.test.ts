import { describe, it, expect } from "vitest";
import { buildText, buildMarkdown } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("buildText", () => {
  it("builds canonical field: value lines", () => {
    const values = {
      experiment_id: "paywall_copy_test",
      variant: "B",
      surface: "pricing_modal",
      enabled: "true",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe(
      "experiment_id: paywall_copy_test\nvariant: B\nsurface: pricing_modal\nenabled: true"
    );
  });

  it("omits empty optional fields", () => {
    const values = {
      experiment_id: "test",
      variant: "A",
      surface: "",
      enabled: "",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe("experiment_id: test\nvariant: A");
  });

  it("keeps empty required fields with empty value", () => {
    const values = {
      experiment_id: "",
      variant: "B",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe("experiment_id: \nvariant: B");
  });

  it("handles multiline values with indentation", () => {
    const fields: FieldSchema[] = [
      { name: "note", type: "text", required: false, multiline: true },
      { name: "owner", type: "text", required: false },
    ];
    const values = {
      note: "line one\nline two\nline three",
      owner: "alice",
    };
    const result = buildText(fields, values);
    expect(result).toBe("note: line one\n  line two\n  line three\nowner: alice");
  });

  it("preserves field order from schema", () => {
    const values = {
      enabled: "true",
      experiment_id: "test",
      variant: "A",
      surface: "modal",
    };
    const result = buildText(experimentFields, values);
    const lines = result.split("\n");
    expect(lines[0]).toMatch(/^experiment_id:/);
    expect(lines[1]).toMatch(/^variant:/);
    expect(lines[2]).toMatch(/^surface:/);
    expect(lines[3]).toMatch(/^enabled:/);
  });
});

describe("buildMarkdown", () => {
  it("builds markdown with bold field names and list values", () => {
    const fields: FieldSchema[] = [
      { name: "experiment_id", type: "text", required: true },
      { name: "variant", type: "select", required: true, options: ["A", "B"] },
    ];
    const values = { experiment_id: "test", variant: "B" };
    const result = buildMarkdown(fields, values);
    expect(result).toBe("**experiment_id**\n- test\n\n**variant**\n- B");
  });

  it("omits empty optional fields in markdown", () => {
    const fields: FieldSchema[] = [
      { name: "action", type: "text", required: true },
      { name: "note", type: "text", required: false },
    ];
    const values = { action: "click", note: "" };
    expect(buildMarkdown(fields, values)).toBe("**action**\n- click");
  });
});
