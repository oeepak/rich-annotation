import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/preact";
import { h } from "preact";

afterEach(() => cleanup());

vi.mock("@create-figma-plugin/ui", () => ({
  Textbox: ({ value, onValueInput, ...rest }: any) =>
    h("input", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  TextboxNumeric: ({ value, onValueInput, ...rest }: any) =>
    h("input", { type: "number", value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  Dropdown: ({ value, onValueChange, options, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      (options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
    ),
  Checkbox: ({ children, value, onValueChange, ...rest }: any) =>
    h("label", {},
      h("input", { type: "checkbox", checked: value, onChange: (e: any) => onValueChange?.(e.target.checked), ...rest }),
      children
    ),
}));

import { FieldInput, GroupFieldInput } from "../../src/ui/components/FieldInput";
import type { FieldSchema } from "../../src/shared/types";

describe("FieldInput — text field", () => {
  const textSchema: FieldSchema = { name: "Title", type: "text" };

  it("renders field label", () => {
    const { container } = render(
      <FieldInput schema={textSchema} value="" matched={true} onChange={() => {}} />
    );
    expect(container.querySelector(".fieldLabel")!.textContent).toBe("Title");
  });

  it("shows error message when matched=false and value is not empty", () => {
    const { getByText } = render(
      <FieldInput schema={textSchema} value="hello" matched={false} onChange={() => {}} />
    );
    expect(getByText("Type mismatch")).toBeInTheDocument();
  });

  it("no error when matched=true", () => {
    const { queryByText } = render(
      <FieldInput schema={textSchema} value="hello" matched={true} onChange={() => {}} />
    );
    expect(queryByText("Type mismatch")).toBeNull();
  });

  it("no error when value is empty even if matched=false", () => {
    const { queryByText } = render(
      <FieldInput schema={textSchema} value="" matched={false} onChange={() => {}} />
    );
    expect(queryByText("Type mismatch")).toBeNull();
  });
});

describe("FieldInput — select field", () => {
  const selectSchema: FieldSchema = {
    name: "Status",
    type: "select",
    options: ["draft", "ready", "done"],
  };

  it("renders field label", () => {
    const { container } = render(
      <FieldInput schema={selectSchema} value="" matched={true} onChange={() => {}} />
    );
    expect(container.querySelector(".fieldLabel")!.textContent).toBe("Status");
  });

  it('"Not a valid option" error when value is invalid and matched=false', () => {
    const { getByText } = render(
      <FieldInput schema={selectSchema} value="invalid" matched={false} onChange={() => {}} />
    );
    expect(getByText("Not a valid option")).toBeInTheDocument();
  });

  it("falls back to null when value is not in options (prevents Dropdown crash)", () => {
    const { container } = render(
      <FieldInput schema={selectSchema} value="bogus" matched={false} onChange={() => {}} />
    );
    expect(container.querySelector(".fieldGroup")).not.toBeNull();
  });
});

describe("FieldInput — boolean field", () => {
  const boolSchema: FieldSchema = { name: "Active", type: "boolean" };

  it('falls back to null when value is not "true"/"false" (prevents Dropdown crash)', () => {
    const { container } = render(
      <FieldInput schema={boolSchema} value="yes" matched={false} onChange={() => {}} />
    );
    expect(container.querySelector(".fieldGroup")).not.toBeNull();
  });
});

describe("GroupFieldInput", () => {
  const groupSchema: FieldSchema = {
    name: "Dimensions",
    type: "group",
    children: [
      { name: "Width", type: "number" },
      { name: "Height", type: "number" },
    ],
  };

  it("renders all child fields", () => {
    const { container } = render(
      <GroupFieldInput
        schema={groupSchema}
        values={{ Width: "100", Height: "200" }}
        childMatches={{ Width: true, Height: true }}
        onChildChange={() => {}}
      />
    );
    const labels = container.querySelectorAll(".fieldLabel");
    const labelTexts = Array.from(labels).map((el) => el.textContent);
    expect(labelTexts).toContain("Dimensions");
    expect(labelTexts).toContain("Width");
    expect(labelTexts).toContain("Height");
  });
});
