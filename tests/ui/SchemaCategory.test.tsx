import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";

vi.mock("@create-figma-plugin/ui", () => ({
  Button: ({ children, onClick, ...rest }: any) =>
    h("button", { onClick, ...rest }, children),
  Textbox: ({ value, onValueInput, placeholder, ...rest }: any) =>
    h("input", { value, onInput: (e: any) => onValueInput?.(e.target.value), placeholder, ...rest }),
  Dropdown: ({ value, options, onValueChange, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      (options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
    ),
}));

import { SchemaCategory } from "../../src/ui/components/SchemaCategory";
import type { CategorySchema } from "@shared/types";

afterEach(() => cleanup());

describe("SchemaCategory", () => {
  const baseSchema: CategorySchema = {
    categoryId: "cat1",
    categoryLabel: "Tracking",
    fields: [{ name: "EventType", type: "text" }],
  };

  it("renders category label", () => {
    const { getByText } = render(
      <SchemaCategory schema={baseSchema} onChange={vi.fn()} />
    );
    expect(getByText("Tracking")).toBeInTheDocument();
  });

  it("renders existing fields", () => {
    const { container } = render(
      <SchemaCategory schema={baseSchema} onChange={vi.fn()} />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("EventType");
  });

  it("shows empty message when no fields", () => {
    const emptySchema: CategorySchema = { ...baseSchema, fields: [] };
    const { getByText } = render(
      <SchemaCategory schema={emptySchema} onChange={vi.fn()} />
    );
    expect(getByText(/No fields/)).toBeInTheDocument();
  });

  it("calls onChange with new field when + Add is clicked", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <SchemaCategory schema={baseSchema} onChange={onChange} />
    );
    fireEvent.click(getByText("+ Add"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: [
          { name: "EventType", type: "text" },
          { name: "", type: "text" },
        ],
      })
    );
  });

  it("calls onChange without field when x (delete) is clicked", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <SchemaCategory schema={baseSchema} onChange={onChange} />
    );
    fireEvent.click(getByText("x"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [] })
    );
  });
});
