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

import { SchemaFieldRow, FieldOptionsEditor } from "../../src/ui/components/SchemaFieldRow";
import type { FieldSchema } from "../../src/shared/types";

afterEach(() => cleanup());

describe("SchemaFieldRow", () => {
  it("renders field name input and type dropdown", () => {
    const field: FieldSchema = { name: "Title", type: "text" };
    const { container } = render(
      <SchemaFieldRow field={field} onChange={vi.fn()} onDelete={vi.fn()} />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("Title");

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("text");
  });

  it("calls onChange when name is edited", () => {
    const onChange = vi.fn();
    const field: FieldSchema = { name: "Title", type: "text" };
    const { container } = render(
      <SchemaFieldRow field={field} onChange={onChange} onDelete={vi.fn()} />
    );
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "NewTitle" } });
    expect(onChange).toHaveBeenCalledWith({ ...field, name: "NewTitle" });
  });

  it("calls onChange with options when type changes to select", () => {
    const onChange = vi.fn();
    const field: FieldSchema = { name: "Status", type: "text" };
    const { container } = render(
      <SchemaFieldRow field={field} onChange={onChange} onDelete={vi.fn()} />
    );
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "select" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "select", options: [""] })
    );
  });

  it("calls onChange with children when type changes to group", () => {
    const onChange = vi.fn();
    const field: FieldSchema = { name: "Size", type: "text" };
    const { container } = render(
      <SchemaFieldRow field={field} onChange={onChange} onDelete={vi.fn()} />
    );
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "group" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "group",
        children: [{ name: "", type: "text" }],
      })
    );
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    const field: FieldSchema = { name: "Title", type: "text" };
    const { getByText } = render(
      <SchemaFieldRow field={field} onChange={vi.fn()} onDelete={onDelete} />
    );
    fireEvent.click(getByText("x"));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});

describe("FieldOptionsEditor", () => {
  it("renders nothing for text/number/boolean types", () => {
    const { container } = render(
      <FieldOptionsEditor field={{ name: "X", type: "text" }} onChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders options input for select type", () => {
    const field: FieldSchema = { name: "Status", type: "select", options: ["A", "B"] };
    const { container } = render(
      <FieldOptionsEditor field={field} onChange={vi.fn()} />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("A, B");
  });

  it("updates options on input", () => {
    const onChange = vi.fn();
    const field: FieldSchema = { name: "Status", type: "select", options: ["A"] };
    const { container } = render(
      <FieldOptionsEditor field={field} onChange={onChange} />
    );
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "X, Y, Z" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ options: ["X", "Y", "Z"] })
    );
  });

  it("renders children editor for group type", () => {
    const field: FieldSchema = {
      name: "Size",
      type: "group",
      children: [{ name: "Width", type: "number" }],
    };
    const { container, getByText } = render(
      <FieldOptionsEditor field={field} onChange={vi.fn()} />
    );
    expect(container.querySelector("input")).not.toBeNull();
    expect(getByText("+ Child")).toBeInTheDocument();
  });

  it("adds a child when + Child is clicked", () => {
    const onChange = vi.fn();
    const field: FieldSchema = {
      name: "Size",
      type: "group",
      children: [{ name: "Width", type: "number" }],
    };
    const { getByText } = render(
      <FieldOptionsEditor field={field} onChange={onChange} />
    );
    fireEvent.click(getByText("+ Child"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          { name: "Width", type: "number" },
          { name: "", type: "text" },
        ],
      })
    );
  });

  it("deletes a child when x is clicked", () => {
    const onChange = vi.fn();
    const field: FieldSchema = {
      name: "Size",
      type: "group",
      children: [
        { name: "Width", type: "number" },
        { name: "Height", type: "number" },
      ],
    };
    const { getAllByText } = render(
      <FieldOptionsEditor field={field} onChange={onChange} />
    );
    // Click first child's delete button
    fireEvent.click(getAllByText("x")[0]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [{ name: "Height", type: "number" }],
      })
    );
  });
});
