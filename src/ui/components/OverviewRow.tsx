import { h } from 'preact';
import { Button } from "@create-figma-plugin/ui";
import type { AnnotationInfo } from "@shared/types";
import { postToPlugin } from "../hooks/usePluginMessage";
import styles from "../styles";

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  yellow: { bg: "#f5a623", fg: "#fff" },
  orange: { bg: "#e8601c", fg: "#fff" },
  red: { bg: "#e03e3e", fg: "#fff" },
  pink: { bg: "#d84a8a", fg: "#fff" },
  violet: { bg: "#7b61ff", fg: "#fff" },
  blue: { bg: "#0d99ff", fg: "#fff" },
  teal: { bg: "#15b8a6", fg: "#fff" },
  green: { bg: "#14ae5c", fg: "#fff" },
};

interface OverviewRowProps {
  annotation: AnnotationInfo;
  categoryColor?: string;
  onNavigate: () => void;
  onEdit: () => void;
}

export function OverviewRow({ annotation, categoryColor, onNavigate, onEdit }: OverviewRowProps) {

  const colors = categoryColor ? COLOR_MAP[categoryColor.toLowerCase()] : undefined;
  const badgeStyle = colors
    ? { background: colors.bg, color: colors.fg }
    : undefined;

  return (
    <div className={styles.rowCard} onClick={onNavigate}>
      <div className={styles.rowHeader}>
        <span className={styles.badge} style={badgeStyle}>
          {annotation.categoryLabel || "—"}
        </span>
        <span style={{ fontWeight: 500, flex: 1 }}>{annotation.nodeName}</span>
        <Button secondary onClick={(e: Event) => { e.stopPropagation(); onEdit(); }}>Edit</Button>
      </div>
      {annotation.label && (
        <div className={styles.rowBody}>
          {annotation.label}
        </div>
      )}
    </div>
  );
}
