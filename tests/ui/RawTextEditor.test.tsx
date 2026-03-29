import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { h } from "preact";

vi.mock("@create-figma-plugin/ui", () => ({
  TextboxMultiline: ({ value, onValueInput, ...rest }: any) =>
    h("textarea", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
}));

import { RawTextEditor } from "../../src/ui/components/RawTextEditor";

afterEach(() => cleanup());

describe("RawTextEditor", () => {
  it("renders textarea with value", () => {
    const { container } = render(
      <RawTextEditor value="hello world" onChange={vi.fn()} />
    );
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe("hello world");
  });

  it("calls onChange when text is edited", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RawTextEditor value="" onChange={onChange} />
    );
    const textarea = container.querySelector("textarea")!;
    fireEvent.input(textarea, { target: { value: "new text" } });
    expect(onChange).toHaveBeenCalledWith("new text");
  });

  it("shows helper text", () => {
    const { getByText } = render(
      <RawTextEditor value="" onChange={vi.fn()} />
    );
    expect(getByText(/raw text/i)).toBeInTheDocument();
  });
});
