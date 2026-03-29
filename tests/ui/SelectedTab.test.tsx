import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/ui/hooks/usePluginMessage", () => ({
  postToPlugin: vi.fn(),
}));

vi.mock("@create-figma-plugin/ui", () => ({
  Button: ({ children, onClick, ...rest }: any) =>
    h("button", { onClick, ...rest }, children),
  Textbox: ({ value, onValueInput, ...rest }: any) =>
    h("input", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  Dropdown: ({ value, options, onValueChange, placeholder, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      [
        placeholder ? h("option", { key: "__ph__", value: "" }, placeholder) : null,
        ...(options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
      ]
    ),
  TextboxMultiline: ({ value, onValueInput, ...rest }: any) =>
    h("textarea", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  TextboxNumeric: ({ value, onValueInput, ...rest }: any) =>
    h("input", { type: "number", value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  Checkbox: ({ children, value, onValueChange, ...rest }: any) =>
    h("label", {},
      h("input", { type: "checkbox", checked: value, onChange: (e: any) => onValueChange?.(e.target.checked), ...rest }),
      children
    ),
}));

import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";
import type { AnnotationInfo, SchemaStore, AnnotationCategory } from "@shared/types";
import { SelectedTab } from "../../src/ui/components/SelectedTab";
import { postToPlugin } from "../../src/ui/hooks/usePluginMessage";

afterEach(() => cleanup());

const categories: AnnotationCategory[] = [
  { id: "cat1", label: "Tracking", color: "blue" },
  { id: "cat2", label: "Design", color: "green" },
];

const schemas: SchemaStore = {
  cat1: {
    categoryId: "cat1",
    categoryLabel: "Tracking",
    fields: [
      { name: "EventType", type: "text" },
      { name: "Priority", type: "select", options: ["high", "low"] },
    ],
  },
};

const makeAnnotation = (overrides: Partial<AnnotationInfo> = {}): AnnotationInfo => ({
  nodeId: "1:1",
  nodeName: "Button",
  nodeType: "FRAME",
  categoryId: "cat1",
  categoryLabel: "Tracking",
  label: "EventType\n- Click\nPriority\n- high",
  parsedFields: [
    { name: "EventType", rawValue: "Click", parsedValue: "Click", matched: true },
    { name: "Priority", rawValue: "high", parsedValue: "high", matched: true },
  ],
  parseMatch: "matched",
  fieldData: { EventType: "Click", Priority: "high" },
  ...overrides,
});

describe("SelectedTab", () => {
  it("renders node info", () => {
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="MyButton"
        nodeType="FRAME"
        annotations={[]}
        schemas={{}}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    expect(getByText("MyButton")).toBeInTheDocument();
    expect(getByText(/FRAME/)).toBeInTheDocument();
  });

  it("renders category dropdown", () => {
    const { container } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    const select = container.querySelector("select");
    expect(select).not.toBeNull();
  });

  it("auto-selects first annotation category", () => {
    const { container } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    // Should render field inputs for the schema
    expect(container.querySelector(".sectionLabel")).not.toBeNull();
  });

  it('shows "No schema for this category" when schema is missing', () => {
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation({ categoryId: "cat2", categoryLabel: "Design" })]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    expect(getByText("No schema for this category")).toBeInTheDocument();
  });

  it("shows Schema and Raw Text buttons when no schema", () => {
    const onGoToSchema = vi.fn();
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation({ categoryId: "cat2" })]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={onGoToSchema}
      />
    );
    expect(getByText("Schema")).toBeInTheDocument();
    expect(getByText("Raw Text")).toBeInTheDocument();

    fireEvent.click(getByText("Schema"));
    expect(onGoToSchema).toHaveBeenCalledOnce();
  });

  it("shows Apply and Delete buttons when category is selected", () => {
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    expect(getByText("Apply")).toBeInTheDocument();
    expect(getByText("Delete")).toBeInTheDocument();
  });

  it("calls postToPlugin with DELETE_ANNOTATION on Delete click", () => {
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    fireEvent.click(getByText("Delete"));
    expect(postToPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DELETE_ANNOTATION", nodeId: "1:1", categoryId: "cat1" })
    );
  });

  it("calls postToPlugin with APPLY_ANNOTATION on Apply click", () => {
    const { getByText } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    fireEvent.click(getByText("Apply"));
    expect(postToPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ type: "APPLY_ANNOTATION", nodeId: "1:1", categoryId: "cat1" })
    );
  });

  it("toggles raw mode when Raw button is clicked", () => {
    const { getByText, container } = render(
      <SelectedTab
        nodeId="1:1"
        nodeName="Button"
        nodeType="FRAME"
        annotations={[makeAnnotation()]}
        schemas={schemas}
        categories={categories}
        onGoToSchema={vi.fn()}
      />
    );
    // Initially in field mode → Raw button visible
    fireEvent.click(getByText("Raw"));
    // Should now show textarea (raw mode)
    expect(container.querySelector("textarea")).not.toBeNull();

    // Toggle back
    fireEvent.click(getByText("Fields"));
    expect(container.querySelector("textarea")).toBeNull();
  });
});
