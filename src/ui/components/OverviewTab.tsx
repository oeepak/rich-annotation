import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Button, Dropdown, Textbox } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";
import type { AnnotationInfo, SchemaStore, AnnotationCategory } from "@shared/types";
import { OverviewRow } from "./OverviewRow";
import { postToPlugin } from "../hooks/usePluginMessage";

interface OverviewTabProps {
  annotations: AnnotationInfo[];
  schemas: SchemaStore;
  categories: AnnotationCategory[];
  onEdit: (nodeId: string) => void;
}

const ALL = "__all__";

export function OverviewTab({ annotations, schemas, categories, onEdit }: OverviewTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    postToPlugin({ type: "GET_ANNOTATIONS" });
  }, []);

  // Collect unique categories from annotations
  const categoryIds = Array.from(
    new Set(annotations.map((a) => a.categoryId).filter(Boolean))
  ) as string[];

  // Filter
  let filtered = annotations;

  if (categoryFilter) {
    filtered = filtered.filter((a) => a.categoryId === categoryFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((a) => {
      if (a.nodeName.toLowerCase().includes(q)) return true;
      if (a.categoryLabel.toLowerCase().includes(q)) return true;
      if (a.label.toLowerCase().includes(q)) return true;
      if (a.parsedFields.some((f) =>
        f.name.toLowerCase().includes(q) ||
        f.rawValue.toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const handleExport = (format: "json" | "csv") => {
    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === "json") {
      const data = filtered.map((a) => ({
        nodeId: a.nodeId,
        nodeName: a.nodeName,
        nodeType: a.nodeType,
        category: a.categoryLabel,
        annotationText: a.label,
        fields: Object.fromEntries(
          a.parsedFields.map((f) => [f.name, { raw: f.rawValue, parsed: f.parsedValue, matched: f.matched }])
        ),
        parseMatch: a.parseMatch,
      }));
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
      filename = "annotations.json";
    } else {
      const headers = ["nodeId", "nodeName", "nodeType", "category", "annotationText", "parseMatch"];
      // Add field columns from schemas
      const fieldNames = new Set<string>();
      filtered.forEach((a) => a.parsedFields.forEach((f) => fieldNames.add(f.name)));
      const allFieldNames = Array.from(fieldNames);

      const rows = filtered.map((a) => {
        const base = [a.nodeId, a.nodeName, a.nodeType, a.categoryLabel, a.label, a.parseMatch].map(csvEscape);
        const fieldVals = allFieldNames.map((fn) => {
          const f = a.parsedFields.find((pf) => pf.name === fn);
          return csvEscape(f ? f.rawValue : "");
        });
        return [...base, ...fieldVals].join(",");
      });

      content = [[...headers, ...allFieldNames].join(","), ...rows].join("\n");
      mimeType = "text/csv";
      filename = "annotations.csv";
    }

    // Download via blob
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterOptions: DropdownOption[] = [
    { value: ALL, text: "All" },
    ...categoryIds.map((catId) => ({
      value: catId,
      text: schemas[catId]?.categoryLabel ?? catId,
    })),
  ];

  if (annotations.length === 0) {
    return (
      <div className="tab-content">
        <div className="toolbar">
          <span style={{ fontSize: 11, color: "#999" }}>0 annotations</span>
        </div>
        <div className="empty-state">
          <div style={{ fontWeight: 500 }}>No annotations on this page</div>
          <div>
            Select a node and create a category-based annotation from the
            Selected tab.
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Select a node in Figma to create one.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <span style={{ fontSize: 11, color: "#999" }}>
          {filtered.length} annotation{filtered.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <Button secondary onClick={() => handleExport("json")}>JSON</Button>
          <Button secondary onClick={() => handleExport("csv")}>CSV</Button>
        </div>
      </div>

      <div className="search-bar">
        <Dropdown
          value={categoryFilter || ALL}
          options={filterOptions}
          onValueChange={(val) => setCategoryFilter(val === ALL ? "" : val)}
        />
        <Textbox
          value={search}
          onValueInput={(val) => setSearch(val)}
          placeholder="Search..."
        />
      </div>

      {filtered.map((ann, i) => {
        const cat = categories.find((c) => c.id === ann.categoryId);
        return (
          <OverviewRow
            key={`${ann.nodeId}-${ann.categoryId}-${i}`}
            annotation={ann}
            categoryColor={cat?.color}
            onEdit={() => onEdit(ann.nodeId)}
          />
        );
      })}
    </div>
  );
}
