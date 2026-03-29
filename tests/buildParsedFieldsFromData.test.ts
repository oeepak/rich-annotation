import { describe, it, expect } from "vitest";
import { buildParsedFieldsFromData } from "../src/shared/buildParsedFieldsFromData";
import type { FieldData, FieldSchema } from "../src/shared/types";

describe("buildParsedFieldsFromData", () => {
  it("returns matched parsed fields for valid data", () => {
    const fields: FieldSchema[] = [
      { name: "Title", type: "text" },
      { name: "Count", type: "number" },
    ];
    const data: FieldData = { Title: "hello", Count: "42" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "Title",
      rawValue: "hello",
      parsedValue: "hello",
      matched: true,
    });
    expect(result[1]).toEqual({
      name: "Count",
      rawValue: "42",
      parsedValue: 42,
      matched: true,
    });
  });

  it("returns matched=false for invalid data", () => {
    const fields: FieldSchema[] = [{ name: "Count", type: "number" }];
    const data: FieldData = { Count: "abc" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].matched).toBe(false);
  });

  it("treats missing keys as empty string", () => {
    const fields: FieldSchema[] = [{ name: "Title", type: "text" }];
    const data: FieldData = {};
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].rawValue).toBe("");
    expect(result[0].matched).toBe(true);
  });

  it("handles boolean fields", () => {
    const fields: FieldSchema[] = [{ name: "Active", type: "boolean" }];
    const data: FieldData = { Active: "true" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].parsedValue).toBe(true);
    expect(result[0].matched).toBe(true);
  });

  it("handles select fields with valid option", () => {
    const fields: FieldSchema[] = [
      { name: "Status", type: "select", options: ["draft", "ready"] },
    ];
    const data: FieldData = { Status: "draft" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].parsedValue).toBe("draft");
    expect(result[0].matched).toBe(true);
  });

  it("handles select fields with invalid option", () => {
    const fields: FieldSchema[] = [
      { name: "Status", type: "select", options: ["draft", "ready"] },
    ];
    const data: FieldData = { Status: "invalid" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].matched).toBe(false);
  });

  it("handles group fields with children", () => {
    const fields: FieldSchema[] = [
      {
        name: "Size",
        type: "group",
        children: [
          { name: "Width", type: "number" },
          { name: "Height", type: "number" },
        ],
      },
    ];
    const data: FieldData = { Size: { Width: "100", Height: "200" } };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].name).toBe("Size");
    expect(result[0].matched).toBe(true);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0]).toEqual({
      name: "Width",
      rawValue: "100",
      parsedValue: 100,
      matched: true,
    });
  });

  it("group is not matched when any child is invalid", () => {
    const fields: FieldSchema[] = [
      {
        name: "Size",
        type: "group",
        children: [
          { name: "Width", type: "number" },
          { name: "Height", type: "number" },
        ],
      },
    ];
    const data: FieldData = { Size: { Width: "100", Height: "abc" } };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].matched).toBe(false);
    expect(result[0].children![0].matched).toBe(true);
    expect(result[0].children![1].matched).toBe(false);
  });

  it("group treats non-object data as empty", () => {
    const fields: FieldSchema[] = [
      {
        name: "Size",
        type: "group",
        children: [{ name: "Width", type: "number" }],
      },
    ];
    const data: FieldData = { Size: "not-an-object" };
    const result = buildParsedFieldsFromData(data, fields);

    expect(result[0].children![0].rawValue).toBe("");
  });
});
