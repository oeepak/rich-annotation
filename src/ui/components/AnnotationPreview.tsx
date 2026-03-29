import { h } from 'preact';
import type { ParsedField } from "@shared/types";
import styles from "../styles";

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
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Annotation Text</div>
      <div className={styles.previewBox}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          const isError = unmatchedNames.has(trimmed);
          return (
            <div key={i} className={`${styles.previewLine}${isError ? ` ${styles.error}` : ""}`}>
              {trimmed === "" ? "\u00A0" : line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
