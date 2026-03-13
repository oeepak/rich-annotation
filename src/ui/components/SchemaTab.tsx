import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { SchemaStore, CategorySchema } from "@shared/types";
import { SchemaCategory } from "./SchemaCategory";
import { postToPlugin } from "../hooks/usePluginMessage";

interface SchemaTabProps {
  schemas: SchemaStore;
  categories: { id: string; label: string; color: string }[];
  onBack: () => void;
}

export function SchemaTab({ schemas, categories, onBack }: SchemaTabProps) {
  const [draft, setDraft] = useState<SchemaStore>(schemas);
  const [dirty, setDirty] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  useEffect(() => {
    setDraft(schemas);
    setDirty(false);
  }, [schemas]);

  // Auto-select first category
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

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

  const getSchemaForCategory = (catId: string): CategorySchema => {
    const existing = draft[catId];
    if (existing) return existing;
    const catInfo = categories.find((c) => c.id === catId);
    return {
      categoryId: catId,
      categoryLabel: catInfo?.label ?? catId,
      fields: [],
    };
  };

  const selectedSchema = selectedCategoryId ? getSchemaForCategory(selectedCategoryId) : null;

  return (
    <>
      <div className="tab-content">
        {categories.length === 0 ? (
          <div className="empty-state">
            <div>No annotation categories available.</div>
            <div style={{ fontSize: 11 }}>
              Categories are defined in Figma's annotation settings.
            </div>
          </div>
        ) : (
          <>
            <div className="section">
              <div className="section-label">Category</div>
              <select
                className="select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId((e.target as HTMLSelectElement).value)}
              >
                <option value="">— Select Category —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedSchema && (
              <SchemaCategory
                key={selectedSchema.categoryId}
                schema={selectedSchema}
                onChange={(updated) => handleCategoryChange(selectedSchema.categoryId, updated)}
              />
            )}
          </>
        )}
        <div style={{ fontSize: 10, color: "#999", textAlign: "right" }}>
          Used to build / parse annotation text
        </div>
      </div>
      <div className="action-bar">
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-secondary" onClick={handleReset} disabled={!dirty}>
            Reset
          </button>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={!dirty}>
          Save
        </button>
      </div>
    </>
  );
}
