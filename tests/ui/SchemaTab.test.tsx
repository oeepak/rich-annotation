import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/ui/hooks/usePluginMessage", () => ({
  postToPlugin: vi.fn(),
}));

vi.mock("@create-figma-plugin/ui", () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) =>
    h("button", { onClick, disabled, ...rest }, children),
  Dropdown: ({ value, options, onValueChange, placeholder, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      [
        placeholder ? h("option", { key: "__ph__", value: "" }, placeholder) : null,
        ...(options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
      ]
    ),
  Textbox: ({ value, onValueInput, ...rest }: any) =>
    h("input", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
}));

import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";
import type { SchemaStore, AnnotationCategory } from "@shared/types";
import { SchemaTab } from "../../src/ui/components/SchemaTab";
import { postToPlugin } from "../../src/ui/hooks/usePluginMessage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const categories: AnnotationCategory[] = [
  { id: "cat1", label: "Tracking", color: "blue" },
  { id: "cat2", label: "Design", color: "green" },
];

const schemas: SchemaStore = {
  cat1: {
    categoryId: "cat1",
    categoryLabel: "Tracking",
    fields: [{ name: "EventType", type: "text" }],
  },
};

describe("SchemaTab", () => {
  it("shows empty state when no categories", () => {
    const { getByText } = render(
      <SchemaTab schemas={{}} categories={[]} onBack={vi.fn()} />
    );
    expect(getByText("No annotation categories available.")).toBeInTheDocument();
  });

  it("renders category dropdown when categories exist", () => {
    const { container } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    const select = container.querySelector("select");
    expect(select).not.toBeNull();
  });

  it("auto-selects first category", () => {
    const { container } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    // SchemaCategory renders the category label as <strong>
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("Tracking");
  });

  it("shows Back button that calls onBack", () => {
    const onBack = vi.fn();
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={onBack} />
    );
    fireEvent.click(getByText("Back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("Save button is disabled initially (no changes)", () => {
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    const saveBtn = getByText("Save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("Reset button is disabled initially (no changes)", () => {
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    const resetBtn = getByText("Reset") as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(true);
  });

  it("Save becomes enabled after adding a field", () => {
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    // Click "+ Add" to add a field → marks dirty
    fireEvent.click(getByText("+ Add"));
    const saveBtn = getByText("Save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("calls postToPlugin with SAVE_SCHEMAS on Save click", () => {
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    fireEvent.click(getByText("+ Add"));
    fireEvent.click(getByText("Save"));
    expect(postToPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SAVE_SCHEMAS" })
    );
  });

  it("Reset restores original schemas and disables Save", () => {
    const { getByText } = render(
      <SchemaTab schemas={schemas} categories={categories} onBack={vi.fn()} />
    );
    fireEvent.click(getByText("+ Add"));
    expect((getByText("Save") as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(getByText("Reset"));
    expect((getByText("Save") as HTMLButtonElement).disabled).toBe(true);
  });

  it("creates default schema for category without existing schema", () => {
    const { container, getByText } = render(
      <SchemaTab schemas={{}} categories={categories} onBack={vi.fn()} />
    );
    // First category auto-selected, SchemaCategory shows label in <strong>
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("Tracking");
    // No fields message
    expect(getByText(/No fields/)).toBeInTheDocument();
  });
});
