import { describe, it, expect } from "vitest";
import { parseText } from "../src/shared/parseText";
import type { FieldSchema } from "../src/shared/types";

const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
];

const withGroup: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  {
    name: "Params",
    type: "group",
    required: false,
    children: [
      { name: "order", type: "number", required: false },
      { name: "id", type: "text", required: false },
    ],
  },
];

describe("parseText", () => {
  it("parses flat fields from new format", () => {
    const text = "Event Type\n- Click\n\nEvent Key\n- click_banner";
    const result = parseText(text, flatFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[0]).toMatchObject({ name: "Event Type", rawValue: "Click", matched: true });
    expect(result.fields[1]).toMatchObject({ name: "Event Key", rawValue: "click_banner", matched: true });
  });

  it("parses group fields with sub key: sub value", () => {
    const text = "Event Type\n- Click\n\nParams\n- order: 42\n- id: abc";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[1]).toMatchObject({
      name: "Params",
      matched: true,
      children: [
        { name: "order", rawValue: "42", matched: true },
        { name: "id", rawValue: "abc", matched: true },
      ],
    });
  });

  it("returns not_matched for missing required field", () => {
    const text = "Event Key\n- test";
    const result = parseText(text, flatFields);
    expect(result.parseMatch).toBe("not_matched");
  });

  it("returns empty for missing optional group", () => {
    const text = "Event Type\n- Click";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[1]).toMatchObject({ name: "Params", rawValue: "", matched: true });
  });

  it("handles value with colons in flat field", () => {
    const text = "Event Type\n- url:test:123\n\nEvent Key\n- key";
    const result = parseText(text, flatFields);
    expect(result.fields[0].rawValue).toBe("url:test:123");
  });

  it("validates group children types", () => {
    const text = "Event Type\n- Click\n\nParams\n- order: notanumber\n- id: abc";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("not_matched");
    expect(result.fields[1].children![0].matched).toBe(false);
  });
});
