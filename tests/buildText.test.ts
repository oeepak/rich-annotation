import { describe, it, expect } from "vitest";
import { buildText } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
];

const withGroup: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
  {
    name: "Params",
    type: "group",
    required: false,
    children: [
      { name: "order", type: "text", required: false },
      { name: "id", type: "text", required: false },
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

  it("omits empty optional fields", () => {
    const fields: FieldSchema[] = [
      { name: "Event Type", type: "text", required: true },
      { name: "Note", type: "text", required: false },
    ];
    const values = { "Event Type": "Click", Note: "" };
    expect(buildText(fields, values)).toBe("Event Type\n- Click");
  });

  it("keeps empty required fields", () => {
    const values = { "Event Type": "", "Event Key": "test" };
    expect(buildText(flatFields, values)).toBe(
      "Event Type\n- \n\nEvent Key\n- test"
    );
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

  it("omits group when all children are empty and group is optional", () => {
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
