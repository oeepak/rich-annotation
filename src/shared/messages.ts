import type {
  SchemaStore,
  AnnotationInfo,
  FieldValues,
  FieldData,
  CategorySchema,
} from "./types";

// UI → Plugin messages
export type UIMessage =
  | { type: "INIT" }
  | { type: "GET_SELECTION" }
  | { type: "GET_ANNOTATIONS" }
  | { type: "GET_SCHEMAS" }
  | { type: "SAVE_SCHEMAS"; schemas: SchemaStore }
  | {
      type: "APPLY_ANNOTATION";
      nodeId: string;
      categoryId: string;
      text: string;
      fieldData: FieldData;
    }
  | { type: "DELETE_ANNOTATION"; nodeId: string; categoryId: string }
  | { type: "SELECT_NODE"; nodeId: string }
  | { type: "GET_CATEGORIES" };

// Plugin → UI messages
export type PluginMessage =
  | {
      type: "SELECTION_CHANGED";
      nodeId: string | null;
      nodeName: string;
      nodeType: string;
      annotations: AnnotationInfo[];
    }
  | { type: "SCHEMAS_LOADED"; schemas: SchemaStore }
  | { type: "ANNOTATIONS_LIST"; annotations: AnnotationInfo[] }
  | {
      type: "CATEGORIES_LIST";
      categories: { id: string; label: string }[];
    }
  | { type: "ANNOTATION_APPLIED" }
  | { type: "ANNOTATION_DELETED" };
