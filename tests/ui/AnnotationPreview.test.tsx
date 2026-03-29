import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { h } from "preact";
import { AnnotationPreview } from "../../src/ui/components/AnnotationPreview";
import type { ParsedField } from "../../src/shared/types";

describe("AnnotationPreview", () => {
  it("renders each line of text", () => {
    render(<AnnotationPreview text={"Line A\nLine B\nLine C"} />);
    expect(screen.getByText("Line A")).toBeInTheDocument();
    expect(screen.getByText("Line B")).toBeInTheDocument();
    expect(screen.getByText("Line C")).toBeInTheDocument();
  });

  it("shows \\u00A0 for empty lines", () => {
    const { container } = render(<AnnotationPreview text={"above\n\nbelow"} />);
    const lines = container.querySelectorAll(".previewLine");
    expect(lines).toHaveLength(3);
    expect(lines[1].textContent).toBe("\u00A0");
  });

  it("adds 'error' class to lines matching unmatched field names", () => {
    const parsedFields: ParsedField[] = [
      { name: "Status", rawValue: "draft", parsedValue: "draft", matched: false },
    ];
    const { container } = render(
      <AnnotationPreview text={"Status\n- draft"} parsedFields={parsedFields} />
    );
    const lines = container.querySelectorAll(".previewLine");
    // "Status" matches the unmatched field name → error
    expect(lines[0].classList.contains("error")).toBe(true);
    // "- draft" does not match any field name → no error
    expect(lines[1].classList.contains("error")).toBe(false);
  });

  it("does NOT add 'error' class to matched fields", () => {
    const parsedFields: ParsedField[] = [
      { name: "Status", rawValue: "draft", parsedValue: "draft", matched: true },
    ];
    const { container } = render(
      <AnnotationPreview text={"Status\nother line"} parsedFields={parsedFields} />
    );
    const lines = container.querySelectorAll(".previewLine");
    expect(lines[0].classList.contains("error")).toBe(false);
    expect(lines[1].classList.contains("error")).toBe(false);
  });

  it("produces no error lines when parsedFields is undefined", () => {
    const { container } = render(
      <AnnotationPreview text={"Status\nsome line"} />
    );
    const errorLines = container.querySelectorAll(".previewLine.error");
    expect(errorLines).toHaveLength(0);
  });
});
