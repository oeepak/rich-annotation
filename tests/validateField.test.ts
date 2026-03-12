import { describe, it, expect } from "vitest";
import { validateField } from "../src/shared/validateField";
import type { FieldSchema } from "../src/shared/types";

describe("validateField", () => {
  it("returns string as-is for text type", () => {
    const schema: FieldSchema = { name: "note", type: "text", required: false };
    const result = validateField("hello world", schema);
    expect(result).toEqual({ parsedValue: "hello world", matched: true });
  });

  it("parses valid number", () => {
    const schema: FieldSchema = { name: "count", type: "number", required: false };
    const result = validateField("42", schema);
    expect(result).toEqual({ parsedValue: 42, matched: true });
  });

  it("fails on invalid number", () => {
    const schema: FieldSchema = { name: "count", type: "number", required: false };
    const result = validateField("abc", schema);
    expect(result).toEqual({ parsedValue: null, matched: false });
  });

  it("parses true boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("true", schema)).toEqual({ parsedValue: true, matched: true });
  });

  it("parses false boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("false", schema)).toEqual({ parsedValue: false, matched: true });
  });

  it("fails on invalid boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("maybe", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("validates select with matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      required: false,
      options: ["A", "B", "C"],
    };
    expect(validateField("B", schema)).toEqual({ parsedValue: "B", matched: true });
  });

  it("fails select with non-matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      required: false,
      options: ["A", "B", "C"],
    };
    expect(validateField("D", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("returns not matched for empty required field", () => {
    const schema: FieldSchema = { name: "action", type: "text", required: true };
    expect(validateField("", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("allows empty optional field", () => {
    const schema: FieldSchema = { name: "note", type: "text", required: false };
    expect(validateField("", schema)).toEqual({ parsedValue: "", matched: true });
  });

  it("returns matched for group type", () => {
    const schema: FieldSchema = {
      name: "Params",
      type: "group",
      required: false,
      children: [{ name: "order", type: "number", required: false }],
    };
    expect(validateField("order: 1", schema)).toEqual({ parsedValue: null, matched: true });
  });

  it("returns not matched for empty required group", () => {
    const schema: FieldSchema = {
      name: "Params",
      type: "group",
      required: true,
      children: [{ name: "order", type: "number", required: false }],
    };
    expect(validateField("", schema)).toEqual({ parsedValue: null, matched: false });
  });
});
