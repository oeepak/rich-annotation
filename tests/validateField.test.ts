import { describe, it, expect } from "vitest";
import { validateField } from "../src/shared/validateField";
import type { FieldSchema } from "../src/shared/types";

describe("validateField", () => {
  it("returns string as-is for text type", () => {
    const schema: FieldSchema = { name: "note", type: "text" };
    const result = validateField("hello world", schema);
    expect(result).toEqual({ parsedValue: "hello world", matched: true });
  });

  it("parses valid number", () => {
    const schema: FieldSchema = { name: "count", type: "number" };
    const result = validateField("42", schema);
    expect(result).toEqual({ parsedValue: 42, matched: true });
  });

  it("fails on invalid number", () => {
    const schema: FieldSchema = { name: "count", type: "number" };
    const result = validateField("abc", schema);
    expect(result).toEqual({ parsedValue: null, matched: false });
  });

  it("parses true boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean" };
    expect(validateField("true", schema)).toEqual({ parsedValue: true, matched: true });
  });

  it("parses false boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean" };
    expect(validateField("false", schema)).toEqual({ parsedValue: false, matched: true });
  });

  it("fails on invalid boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean" };
    expect(validateField("maybe", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("validates select with matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      options: ["A", "B", "C"],
    };
    expect(validateField("B", schema)).toEqual({ parsedValue: "B", matched: true });
  });

  it("fails select with non-matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      options: ["A", "B", "C"],
    };
    expect(validateField("D", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("allows empty field", () => {
    const schema: FieldSchema = { name: "note", type: "text" };
    expect(validateField("", schema)).toEqual({ parsedValue: "", matched: true });
  });

  it("returns matched for group type", () => {
    const schema: FieldSchema = {
      name: "Params",
      type: "group",
      children: [{ name: "order", type: "number" }],
    };
    expect(validateField("order: 1", schema)).toEqual({ parsedValue: null, matched: true });
  });
});
