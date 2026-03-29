import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useSelectionFields } from "../../src/ui/hooks/useSelection";
import { buildText } from "../../src/shared/buildText";
import type { FieldSchema, FieldData } from "../../src/shared/types";

const textField: FieldSchema = { name: "Title", type: "text" };
const numberField: FieldSchema = { name: "Width", type: "number" };
const booleanField: FieldSchema = { name: "Visible", type: "boolean" };
const selectField: FieldSchema = { name: "Size", type: "select", options: ["S", "M", "L"] };
const groupField: FieldSchema = {
  name: "Spacing",
  type: "group",
  children: [
    { name: "Top", type: "number" },
    { name: "Bottom", type: "number" },
  ],
};

describe("useSelectionFields", () => {
  it("initializes from fieldData when provided", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const fieldData: FieldData = { Title: "Hello", Width: "42" };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    expect(result.current.fieldValues).toEqual({ Title: "Hello", Width: "42" });
  });

  it("initializes from label text parsing when no fieldData", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const label = "Title\n- Hello\n\nWidth\n- 42";

    const { result } = renderHook(() =>
      useSelectionFields({ label, schemaFields }),
    );

    expect(result.current.fieldValues).toEqual({ Title: "Hello", Width: "42" });
  });

  it("returns empty values when schemaFields is empty", () => {
    const { result } = renderHook(() =>
      useSelectionFields({ label: "anything", schemaFields: [] }),
    );

    expect(result.current.fieldValues).toEqual({});
    expect(result.current.parsedFields).toEqual([]);
    expect(result.current.allMatched).toBe(true);
    expect(result.current.previewText).toBe("");
  });

  it("previewText matches buildText output", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const fieldData: FieldData = { Title: "Hello", Width: "42" };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    const expected = buildText(schemaFields, result.current.fieldValues);
    expect(result.current.previewText).toBe(expected);
  });

  it("updateField updates a single field value", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const fieldData: FieldData = { Title: "Hello", Width: "42" };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    act(() => {
      result.current.updateField("Title", "World");
    });

    expect(result.current.fieldValues.Title).toBe("World");
    expect(result.current.fieldValues.Width).toBe("42");
  });

  it("updateGroupField updates a child field in a group", () => {
    const schemaFields: FieldSchema[] = [groupField];
    const fieldData: FieldData = { Spacing: { Top: "10", Bottom: "20" } };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    act(() => {
      result.current.updateGroupField("Spacing", "Top", "30");
    });

    const spacing = result.current.fieldValues.Spacing as Record<string, string>;
    expect(spacing.Top).toBe("30");
    expect(spacing.Bottom).toBe("20");
  });

  it("allMatched is true when all fields validate", () => {
    const schemaFields: FieldSchema[] = [textField, numberField, booleanField, selectField];
    const fieldData: FieldData = {
      Title: "Hello",
      Width: "42",
      Visible: "true",
      Size: "M",
    };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    expect(result.current.allMatched).toBe(true);
    for (const f of result.current.parsedFields) {
      expect(f.matched).toBe(true);
    }
  });

  it("allMatched is false when a field fails validation", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const fieldData: FieldData = { Title: "Hello", Width: "abc" };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    expect(result.current.allMatched).toBe(false);

    const widthField = result.current.parsedFields.find((f) => f.name === "Width");
    expect(widthField?.matched).toBe(false);
    expect(widthField?.parsedValue).toBeNull();

    const titleField = result.current.parsedFields.find((f) => f.name === "Title");
    expect(titleField?.matched).toBe(true);
  });

  it("currentFieldData reflects current field values", () => {
    const schemaFields: FieldSchema[] = [textField, numberField, groupField];
    const fieldData: FieldData = {
      Title: "Hello",
      Width: "42",
      Spacing: { Top: "10", Bottom: "20" },
    };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    expect(result.current.currentFieldData).toEqual({
      Title: "Hello",
      Width: "42",
      Spacing: { Top: "10", Bottom: "20" },
    });

    act(() => {
      result.current.updateField("Title", "Updated");
    });

    expect(result.current.currentFieldData.Title).toBe("Updated");
    expect(result.current.currentFieldData.Width).toBe("42");
  });
});
