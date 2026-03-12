import { describe, it, expect } from "vitest";
import { buildText } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("buildText", () => {
  it("builds markdown with bold field names and list values", () => {
    const values = {
      experiment_id: "paywall_copy_test",
      variant: "B",
      surface: "pricing_modal",
      enabled: "true",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe(
      "**experiment_id**\n- paywall_copy_test\n\n**variant**\n- B\n\n**surface**\n- pricing_modal\n\n**enabled**\n- true"
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
    expect(result).toBe("**experiment_id**\n- test\n\n**variant**\n- A");
  });

  it("keeps empty required fields", () => {
    const values = {
      experiment_id: "",
      variant: "B",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe("**experiment_id**\n- \n\n**variant**\n- B");
  });

  it("preserves field order from schema", () => {
    const values = {
      enabled: "true",
      experiment_id: "test",
      variant: "A",
      surface: "modal",
    };
    const result = buildText(experimentFields, values);
    const blocks = result.split("\n\n");
    expect(blocks[0]).toMatch(/^\*\*experiment_id\*\*/);
    expect(blocks[1]).toMatch(/^\*\*variant\*\*/);
    expect(blocks[2]).toMatch(/^\*\*surface\*\*/);
    expect(blocks[3]).toMatch(/^\*\*enabled\*\*/);
  });
});
