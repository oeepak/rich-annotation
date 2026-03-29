import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { h } from "preact";
import { AnnotationPreview } from "../../src/ui/components/AnnotationPreview";

describe("smoke: @testing-library/preact renders cfp/ui components", () => {
  it("renders AnnotationPreview without crashing", () => {
    const { container } = render(<AnnotationPreview text="hello" />);
    expect(container.textContent).toContain("hello");
  });
});
