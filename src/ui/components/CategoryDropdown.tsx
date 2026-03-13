import { h } from "preact";
import { Dropdown } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";
import type { AnnotationCategory } from "@shared/types";

interface CategoryDropdownProps {
  categories: AnnotationCategory[];
  value: string;
  onValueChange: (categoryId: string) => void;
  placeholder?: string;
}

export function CategoryDropdown({ categories, value, onValueChange, placeholder }: CategoryDropdownProps) {
  const options: DropdownOption[] = categories.map((cat) => ({
    value: cat.id,
    text: cat.label,
  }));
  return (
    <Dropdown
      value={value || null}
      options={options}
      onValueChange={onValueChange}
      placeholder={placeholder ?? "— Select Category —"}
    />
  );
}
