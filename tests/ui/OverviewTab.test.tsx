import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/ui/hooks/usePluginMessage", () => ({
  postToPlugin: vi.fn(),
  usePluginMessage: vi.fn(),
}));

vi.mock("@create-figma-plugin/ui", () => ({
  Button: ({ children, onClick, ...rest }: any) =>
    h("button", { onClick, ...rest }, children),
  Dropdown: ({ value, options, onValueChange, ...rest }: any) =>
    h(
      "select",
      {
        value,
        onChange: (e: any) => onValueChange(e.target.value),
        ...rest,
      },
      options.map((opt: any) =>
        h("option", { key: opt.value, value: opt.value }, opt.text)
      )
    ),
  Textbox: ({ value, onValueInput, placeholder, ...rest }: any) =>
    h("input", {
      value,
      onInput: (e: any) => onValueInput(e.target.value),
      placeholder,
      ...rest,
    }),
}));

import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";
import type { AnnotationInfo } from "@shared/types";
import { OverviewTab } from "../../src/ui/components/OverviewTab";

afterEach(() => {
  cleanup();
});

const mockAnnotation = (overrides: Partial<AnnotationInfo> = {}): AnnotationInfo => ({
  nodeId: "1:1",
  nodeName: "Button",
  nodeType: "FRAME",
  categoryId: "cat1",
  categoryLabel: "Tracking",
  label: "Event Type\n- Click",
  parsedFields: [],
  parseMatch: "matched",
  ...overrides,
});

const defaultProps = () => ({
  annotations: [] as AnnotationInfo[],
  schemas: {} as any,
  categories: [] as { id: string; label: string; color: string }[],
  onNavigate: vi.fn() as (nodeId: string) => void,
  onEdit: vi.fn() as (nodeId: string) => void,
});

describe("OverviewTab", () => {
  it('shows empty state "No annotations on this page" when annotations is empty', () => {
    const props = defaultProps();
    const { getByText } = render(<OverviewTab {...props} />);

    expect(getByText("No annotations on this page")).toBeInTheDocument();
  });

  it("shows annotation count", () => {
    const props = defaultProps();
    props.annotations = [
      mockAnnotation({ nodeId: "1:1" }),
      mockAnnotation({ nodeId: "1:2", nodeName: "Card" }),
      mockAnnotation({ nodeId: "1:3", nodeName: "Icon" }),
    ];

    const { getByText } = render(<OverviewTab {...props} />);

    expect(getByText("3 annotations")).toBeInTheDocument();
  });

  it("renders an OverviewRow for each annotation", () => {
    const props = defaultProps();
    props.annotations = [
      mockAnnotation({ nodeId: "1:1", nodeName: "PrimaryButton" }),
      mockAnnotation({ nodeId: "1:2", nodeName: "Card" }),
    ];

    const { getByText } = render(<OverviewTab {...props} />);

    expect(getByText("PrimaryButton")).toBeInTheDocument();
    expect(getByText("Card")).toBeInTheDocument();
  });

  it("shows 0 annotations when search produces no results", () => {
    const props = defaultProps();
    props.annotations = [mockAnnotation()];

    const { getByPlaceholderText, getByText } = render(
      <OverviewTab {...props} />
    );

    const searchInput = getByPlaceholderText("Search...");
    fireEvent.input(searchInput, { target: { value: "zzz_no_match" } });

    expect(getByText("0 annotations")).toBeInTheDocument();
  });

  it('category filter dropdown shows "All" by default with value "__all__"', () => {
    const props = defaultProps();
    props.annotations = [mockAnnotation()];

    const { container } = render(<OverviewTab {...props} />);

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("__all__");

    const allOption = select.querySelector('option[value="__all__"]');
    expect(allOption).not.toBeNull();
    expect(allOption!.textContent).toBe("All");
  });

  it("shows singular 'annotation' for a single item", () => {
    const props = defaultProps();
    props.annotations = [mockAnnotation()];

    const { getByText } = render(<OverviewTab {...props} />);

    expect(getByText("1 annotation")).toBeInTheDocument();
  });

  it("shows '0 annotations' in empty state toolbar", () => {
    const props = defaultProps();

    const { getByText } = render(<OverviewTab {...props} />);

    expect(getByText("0 annotations")).toBeInTheDocument();
  });

  it("filters annotations by category when dropdown changes", () => {
    const props = defaultProps();
    props.annotations = [
      mockAnnotation({ nodeId: "1:1", nodeName: "PrimaryButton", categoryId: "cat1", categoryLabel: "Tracking" }),
      mockAnnotation({ nodeId: "1:2", nodeName: "Card", categoryId: "cat2", categoryLabel: "Design" }),
    ];

    const { container, queryByText } = render(<OverviewTab {...props} />);

    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "cat2" } });

    expect(queryByText("Card")).toBeInTheDocument();
    expect(queryByText("PrimaryButton")).not.toBeInTheDocument();
  });
});
