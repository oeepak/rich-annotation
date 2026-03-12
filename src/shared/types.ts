export type FieldType = "text" | "number" | "boolean" | "select" | "group";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];       // for select type
  children?: FieldSchema[]; // for group type — only flat children (no nested groups)
}

// Structured field data for pluginData storage
export type FieldData = Record<string, string | Record<string, string>>;

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
  children?: ParsedField[]; // for group type
}

export type ParseMatch = "matched" | "not_matched" | "no_schema";

export interface AnnotationInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  categoryId: string | undefined;
  categoryLabel: string;
  label: string;
  fieldData?: FieldData;
  parsedFields: ParsedField[];
  parseMatch: ParseMatch;
}

export interface FieldValues {
  [fieldName: string]: string;
}
