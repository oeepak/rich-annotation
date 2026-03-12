import React, { useState, useEffect } from "react";
import type { SchemaStore, CategorySchema } from "@shared/types";
import { SchemaCategory } from "./SchemaCategory";
import { postToPlugin } from "../hooks/usePluginMessage";

interface SchemaTabProps {
  schemas: SchemaStore;
  categories: { id: string; label: string }[];
}

export function SchemaTab({ schemas, categories }: SchemaTabProps) {
  const [draft, setDraft] = useState<SchemaStore>(schemas);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(schemas);
    setDirty(false);
  }, [schemas]);

  const handleCategoryChange = (categoryId: string, updated: CategorySchema) => {
    setDraft((prev) => ({ ...prev, [categoryId]: updated }));
    setDirty(true);
  };

  const handleSave = () => {
    postToPlugin({ type: "SAVE_SCHEMAS", schemas: draft });
    setDirty(false);
  };

  const handleReset = () => {
    setDraft(schemas);
    setDirty(false);
  };

  // Ensure all categories have an entry in draft
  const allCategoryIds = new Set([
    ...Object.keys(draft),
    ...categories.map((c) => c.id),
  ]);

  const categorySchemas = Array.from(allCategoryIds).map((catId) => {
    const existing = draft[catId];
    const catInfo = categories.find((c) => c.id === catId);
    return (
      existing ?? {
        categoryId: catId,
        categoryLabel: catInfo?.label ?? catId,
        fields: [],
      }
    );
  });

  return (
    <>
      <div className="tab-content">
        {categorySchemas.length === 0 ? (
          <div className="empty-state">
            <div>No annotation categories available.</div>
            <div style={{ fontSize: 11 }}>
              Categories are defined in Figma's annotation settings.
            </div>
          </div>
        ) : (
          categorySchemas.map((cs) => (
            <SchemaCategory
              key={cs.categoryId}
              schema={cs}
              onChange={(updated) => handleCategoryChange(cs.categoryId, updated)}
            />
          ))
        )}
        <div style={{ fontSize: 10, color: "#999", textAlign: "right" }}>
          Used to build / parse annotation text
        </div>
      </div>
      <div className="action-bar">
        <button className="btn btn-secondary" onClick={handleReset} disabled={!dirty}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!dirty}>
          Save
        </button>
      </div>
    </>
  );
}
