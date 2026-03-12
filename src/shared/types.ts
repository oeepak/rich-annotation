export type FieldType = "text" | "number" | "boolean" | "select";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];    // for select type
  multiline?: boolean;   // for text type, UI-only hint
}

export interface CategorySchema {
  categoryId: string;
  categoryLabel: string;
  fields: FieldSchema[];
}

export type SchemaStore = Record<string, CategorySchema>;
// key = categoryId

export interface ParsedField {
  name: string;
  rawValue: string;
  parsedValue: string | number | boolean | null;
  matched: boolean;
}

export type ParseMatch = "matched" | "not_matched" | "no_schema";

export interface AnnotationInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  categoryId: string | undefined;
  categoryLabel: string;
  label: string;
  parsedFields: ParsedField[];
  parseMatch: ParseMatch;
}

export interface FieldValues {
  [fieldName: string]: string;
}
