import { h, Fragment } from 'preact';
import { TextboxMultiline } from "@create-figma-plugin/ui";

interface RawTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RawTextEditor({ value, onChange }: RawTextEditorProps) {
  return (
    <>
      <TextboxMultiline
        value={value}
        onValueInput={(val: string) => onChange(val)}
        rows={8}
      />
      <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
        Leave raw text as-is or apply schema parsing.
      </div>
    </>
  );
}
