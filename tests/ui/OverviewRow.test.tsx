import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/preact";
import { h } from "preact";
import type { AnnotationInfo } from "@shared/types";

vi.mock("@create-figma-plugin/ui", () => ({
  Button: ({ children, onClick, ...rest }: any) =>
    h("button", { onClick, ...rest }, children),
}));

import { OverviewRow } from "../../src/ui/components/OverviewRow";

function makeAnnotation(overrides: Partial<AnnotationInfo> = {}): AnnotationInfo {
  return {
    nodeId: "1:2",
    nodeName: "Rectangle 1",
    nodeType: "RECTANGLE",
    categoryId: undefined,
    categoryLabel: "Development",
    label: "Implement hover state",
    parsedFields: [],
    parseMatch: "full" as any,
    ...overrides,
  };
}

describe("OverviewRow", () => {
  afterEach(() => cleanup());
  it("renders node name and category label", () => {
    const { getByText } = render(
      <OverviewRow
        annotation={makeAnnotation()}
        onNavigate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(getByText("Rectangle 1")).toBeInTheDocument();
    expect(getByText("Development")).toBeInTheDocument();
  });

  it("shows annotation label text in rowBody", () => {
    const { container } = render(
      <OverviewRow
        annotation={makeAnnotation({ label: "Check spacing" })}
        onNavigate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const body = container.querySelector(".rowBody");
    expect(body).not.toBeNull();
    expect(body!.textContent).toBe("Check spacing");
  });

  it("clicking card calls onNavigate", () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <OverviewRow
        annotation={makeAnnotation()}
        onNavigate={onNavigate}
        onEdit={vi.fn()}
      />,
    );

    fireEvent.click(container.querySelector(".rowCard")!);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("clicking Edit button calls onEdit without triggering onNavigate", () => {
    const onNavigate = vi.fn();
    const onEdit = vi.fn();
    const { getByText } = render(
      <OverviewRow
        annotation={makeAnnotation()}
        onNavigate={onNavigate}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(getByText("Edit"));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("hides rowBody when label is empty", () => {
    const { container } = render(
      <OverviewRow
        annotation={makeAnnotation({ label: "" })}
        onNavigate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(container.querySelector(".rowBody")).toBeNull();
  });

  it('shows "\u2014" when categoryLabel is empty', () => {
    const { container } = render(
      <OverviewRow
        annotation={makeAnnotation({ categoryLabel: "" })}
        onNavigate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const badge = container.querySelector(".badge");
    expect(badge!.textContent).toBe("\u2014");
  });

  it.each([
    ["yellow", "rgb(245, 166, 35)"],
    ["Orange", "rgb(232, 96, 28)"],
    ["RED", "rgb(224, 62, 62)"],
    ["blue", "rgb(13, 153, 255)"],
    ["Green", "rgb(20, 174, 92)"],
  ])("badge gets correct background color for %s (case insensitive)", (color, expectedBg) => {
    const { container } = render(
      <OverviewRow
        annotation={makeAnnotation()}
        categoryColor={color}
        onNavigate={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const badge = container.querySelector(".badge") as HTMLElement;
    expect(badge.style.background).toBe(expectedBg);
    expect(badge.style.color).toBe("rgb(255, 255, 255)");
  });
});
