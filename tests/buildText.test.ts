import { describe, it, expect } from "vitest";
import { buildText } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text" },
  { name: "Event Key", type: "text" },
];

const withGroup: FieldSchema[] = [
  { name: "Event Type", type: "text" },
  { name: "Event Key", type: "text" },
  {
    name: "Params",
    type: "group",
    children: [
      { name: "order", type: "text" },
      { name: "id", type: "text" },
    ],
  },
];

describe("buildText", () => {
  it("builds flat fields with Key / - Value format", () => {
    const values = { "Event Type": "Click", "Event Key": "click_banner" };
    expect(buildText(flatFields, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner"
    );
  });

  it("omits empty fields", () => {
    const values = { "Event Type": "Click", "Event Key": "" };
    expect(buildText(flatFields, values)).toBe("Event Type\n- Click");
  });

  it("builds group fields with sub key: sub value", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "number", id: "uuid" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner\n\nParams\n- order: number\n- id: uuid"
    );
  });

  it("omits group when all children are empty", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "", id: "" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner"
    );
  });

  it("includes group with partial children filled", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "1", id: "" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner\n\nParams\n- order: 1"
    );
  });
});
