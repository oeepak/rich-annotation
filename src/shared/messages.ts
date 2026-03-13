import { EventHandler } from "@create-figma-plugin/utilities";
import type {
  SchemaStore,
  AnnotationInfo,
  FieldData,
} from "./types";

// Plugin → UI
export interface SelectionChangedHandler extends EventHandler {
  name: "SELECTION_CHANGED";
  handler: (data: {
    nodeId: string | null;
    nodeName: string;
    nodeType: string;
    annotations: AnnotationInfo[];
  }) => void;
}

export interface SchemasLoadedHandler extends EventHandler {
  name: "SCHEMAS_LOADED";
  handler: (data: { schemas: SchemaStore }) => void;
}

export interface AnnotationsListHandler extends EventHandler {
  name: "ANNOTATIONS_LIST";
  handler: (data: { annotations: AnnotationInfo[] }) => void;
}

export interface CategoriesListHandler extends EventHandler {
  name: "CATEGORIES_LIST";
  handler: (data: {
    categories: { id: string; label: string; color: string }[];
  }) => void;
}

export interface AnnotationAppliedHandler extends EventHandler {
  name: "ANNOTATION_APPLIED";
  handler: () => void;
}

export interface AnnotationDeletedHandler extends EventHandler {
  name: "ANNOTATION_DELETED";
  handler: () => void;
}

// UI → Plugin
export interface GetAnnotationsHandler extends EventHandler {
  name: "GET_ANNOTATIONS";
  handler: () => void;
}

export interface GetSchemasHandler extends EventHandler {
  name: "GET_SCHEMAS";
  handler: () => void;
}

export interface SaveSchemasHandler extends EventHandler {
  name: "SAVE_SCHEMAS";
  handler: (data: { schemas: SchemaStore }) => void;
}

export interface ApplyAnnotationHandler extends EventHandler {
  name: "APPLY_ANNOTATION";
  handler: (data: {
    nodeId: string;
    categoryId: string;
    text: string;
    fieldData: FieldData;
  }) => void;
}

export interface DeleteAnnotationHandler extends EventHandler {
  name: "DELETE_ANNOTATION";
  handler: (data: { nodeId: string; categoryId: string }) => void;
}

export interface SelectNodeHandler extends EventHandler {
  name: "SELECT_NODE";
  handler: (data: { nodeId: string }) => void;
}

export interface NavigateToNodeHandler extends EventHandler {
  name: "NAVIGATE_TO_NODE";
  handler: (data: { nodeId: string }) => void;
}

export interface GetCategoriesHandler extends EventHandler {
  name: "GET_CATEGORIES";
  handler: () => void;
}

export interface UIReadyHandler extends EventHandler {
  name: "UI_READY";
  handler: () => void;
}
