import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";

vi.mock("@create-figma-plugin/ui", () => ({
  Dropdown: ({ value, options, onValueChange, placeholder, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      [
        placeholder ? h("option", { key: "__ph__", value: "" }, placeholder) : null,
        ...(options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
      ]
    ),
}));

import { CategoryDropdown } from "../../src/ui/components/CategoryDropdown";
import type { AnnotationCategory } from "@shared/types";

afterEach(() => cleanup());

const categories: AnnotationCategory[] = [
  { id: "cat1", label: "Tracking", color: "blue" },
  { id: "cat2", label: "Design", color: "green" },
];

describe("CategoryDropdown", () => {
  it("renders an option for each category", () => {
    const { container } = render(
      <CategoryDropdown categories={categories} value="" onValueChange={vi.fn()} />
    );
    const options = container.querySelectorAll("option");
    // placeholder + 2 categories
    expect(options).toHaveLength(3);
    expect(options[1].textContent).toBe("Tracking");
    expect(options[2].textContent).toBe("Design");
  });

  it("shows custom placeholder when provided", () => {
    const { container } = render(
      <CategoryDropdown categories={categories} value="" onValueChange={vi.fn()} placeholder="Pick one" />
    );
    const placeholder = container.querySelector('option[value=""]');
    expect(placeholder!.textContent).toBe("Pick one");
  });

  it("shows default placeholder when not provided", () => {
    const { container } = render(
      <CategoryDropdown categories={categories} value="" onValueChange={vi.fn()} />
    );
    const placeholder = container.querySelector('option[value=""]');
    expect(placeholder!.textContent).toBe("— Select Category —");
  });

  it("calls onValueChange when selection changes", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <CategoryDropdown categories={categories} value="" onValueChange={onValueChange} />
    );
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "cat2" } });
    expect(onValueChange).toHaveBeenCalledWith("cat2");
  });

  it("selects the correct value", () => {
    const { container } = render(
      <CategoryDropdown categories={categories} value="cat1" onValueChange={vi.fn()} />
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("cat1");
  });
});
