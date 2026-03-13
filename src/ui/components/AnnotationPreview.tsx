import { h } from 'preact';
import type { ParsedField } from "@shared/types";

interface AnnotationPreviewProps {
  text: string;
  parsedFields?: ParsedField[];
}

export function AnnotationPreview({ text, parsedFields }: AnnotationPreviewProps) {
  const lines = text.split("\n");
  const unmatchedNames = new Set(
    (parsedFields ?? []).filter((f) => !f.matched && f.rawValue !== "").map((f) => f.name)
  );

  return (
    <div className="section">
      <div className="section-label">Annotation Text</div>
      <div className="preview-box">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          const isError = unmatchedNames.has(trimmed);
          return (
            <div key={i} className={`preview-line${isError ? " error" : ""}`}>
              {trimmed === "" ? "\u00A0" : line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
