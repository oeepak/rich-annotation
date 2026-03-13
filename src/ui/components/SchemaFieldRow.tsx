import { h } from 'preact';
import { Button, Textbox, Dropdown } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";
import type { FieldSchema, FieldType } from "@shared/types";

interface SchemaFieldRowProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
}

const fieldTypes: FieldType[] = ["text", "number", "boolean", "select", "group"];

export function SchemaFieldRow({ field, onChange, onDelete }: SchemaFieldRowProps) {
  const typeOptions: DropdownOption[] = fieldTypes.map((t) => ({ value: t, text: t }));

  return (
    <div className="schema-field-row">
      <div style={{ flex: 2 }}>
        <Textbox
          value={field.name}
          onValueInput={(val) => onChange({ ...field, name: val })}
          placeholder="field name"
        />
      </div>
      <Dropdown
        value={field.type}
        options={typeOptions}
        onValueChange={(val) => {
          const newType = val as FieldType;
          onChange({
            ...field,
            type: newType,
            options: newType === "select" ? field.options ?? [""] : undefined,
            children: newType === "group" ? field.children ?? [{ name: "", type: "text" }] : undefined,
          });
        }}
      />
      <Button danger onClick={onDelete}>x</Button>
    </div>
  );
}

interface FieldOptionsEditorProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
}

export function FieldOptionsEditor({ field, onChange }: FieldOptionsEditorProps) {
  if (field.type === "select") {
    return (
      <div style={{ marginLeft: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#999" }}>options: </span>
        <Textbox
          value={(field.options ?? []).join(", ")}
          onValueInput={(val) =>
            onChange({
              ...field,
              options: val.split(",").map((s: string) => s.trim()).filter(Boolean),
            })
          }
          placeholder="A, B, C"
        />
      </div>
    );
  }

  if (field.type === "group") {
    const children = field.children ?? [];
    const childTypes: FieldType[] = ["text", "number", "boolean", "select"];
    const childTypeOptions: DropdownOption[] = childTypes.map((t) => ({ value: t, text: t }));

    const addChild = () => {
      onChange({
        ...field,
        children: [...children, { name: "", type: "text" }],
      });
    };

    const updateChild = (index: number, updated: FieldSchema) => {
      const newChildren = [...children];
      newChildren[index] = updated;
      onChange({ ...field, children: newChildren });
    };

    const deleteChild = (index: number) => {
      onChange({ ...field, children: children.filter((_, i) => i !== index) });
    };

    return (
      <div style={{ marginLeft: 16, marginBottom: 4, borderLeft: "2px solid #e0e0e0", paddingLeft: 8 }}>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>children:</div>
        {children.map((child, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ flex: 2 }}>
                <Textbox
                  value={child.name}
                  onValueInput={(val) => updateChild(i, { ...child, name: val })}
                  placeholder="child name"
                />
              </div>
              <Dropdown
                value={child.type}
                options={childTypeOptions}
                onValueChange={(val) => {
                  const t = val as FieldType;
                  updateChild(i, {
                    ...child,
                    type: t,
                    options: t === "select" ? child.options ?? [""] : undefined,
                  });
                }}
              />
              <Button danger onClick={() => deleteChild(i)}>x</Button>
            </div>
            {child.type === "select" && (
              <div style={{ marginLeft: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#999" }}>options: </span>
                <Textbox
                  value={(child.options ?? []).join(", ")}
                  onValueInput={(val) =>
                    updateChild(i, {
                      ...child,
                      options: val.split(",").map((s: string) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="A, B, C"
                />
              </div>
            )}
          </div>
        ))}
        <Button secondary onClick={addChild}>+ Child</Button>
      </div>
    );
  }

  return null;
}
