import { emit, on, showUI } from "@create-figma-plugin/utilities";
import type { SchemaStore, AnnotationInfo, FieldData, ParsedField, ParseMatch, AnnotationCategory } from "../shared/types";
import { buildParsedFieldsFromData } from "../shared/buildParsedFieldsFromData";
import type {
  SelectionChangedHandler,
  SchemasLoadedHandler,
  AnnotationsListHandler,
  CategoriesListHandler,
  AnnotationAppliedHandler,
  AnnotationDeletedHandler,
  GetAnnotationsHandler,
  GetSchemasHandler,
  SaveSchemasHandler,
  ApplyAnnotationHandler,
  DeleteAnnotationHandler,
  SelectNodeHandler,
  NavigateToNodeHandler,
  GetCategoriesHandler,
  UIReadyHandler,
} from "../shared/messages";
import { parseText } from "../shared/parseText";
import { buildText } from "../shared/buildText";

const SCHEMA_KEY = "rich-annotation-schemas";
function annotationDataKey(categoryId: string) {
  return `rich-annotation-data:${categoryId}`;
}

// --- Schema Storage ---

function loadSchemas(): SchemaStore {
  const raw = figma.root.getPluginData(SCHEMA_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SchemaStore;
  } catch {
    return {};
  }
}

function saveSchemas(schemas: SchemaStore): void {
  figma.root.setPluginData(SCHEMA_KEY, JSON.stringify(schemas));
}

let cachedCategories: AnnotationCategory[] = [];

async function ensureCategoriesLoaded(): Promise<void> {
  if (cachedCategories.length === 0) {
    const cats = await figma.annotations.getAnnotationCategoriesAsync();
    cachedCategories = cats.map((c) => ({ id: c.id, label: c.label, color: c.color }));
  }
}

function getCategoryLabel(catId: string, schemas: SchemaStore): string {
  if (schemas[catId]?.categoryLabel) return schemas[catId].categoryLabel;
  const found = cachedCategories.find((c) => c.id === catId);
  return found?.label ?? catId;
}

// --- Annotation Helpers ---

function buildAnnotationInfo(
  node: SceneNode,
  ann: { label?: string; categoryId?: string },
  schemas: SchemaStore
): AnnotationInfo {
  const catId = ann.categoryId ?? "";
  const label = ann.label ?? "";
  const schema = schemas[catId];

  let parsedFields: ParsedField[] = [];
  let parseMatch: ParseMatch = "no_schema";
  let fieldData: FieldData | undefined;

  const dataKey = annotationDataKey(catId);
  const rawData = "getPluginData" in node ? (node as FrameNode).getPluginData(dataKey) : "";
  if (rawData) {
    try {
      fieldData = JSON.parse(rawData) as FieldData;
    } catch {}
  }

  if (schema) {
    if (fieldData) {
      const expectedText = buildText(schema.fields, fieldData);
      if (expectedText === label) {
        parsedFields = buildParsedFieldsFromData(fieldData, schema.fields);
      } else {
        fieldData = undefined;
        const result = parseText(label, schema.fields);
        parsedFields = result.fields;
      }
    } else {
      const result = parseText(label, schema.fields);
      parsedFields = result.fields;
    }
    parseMatch = parsedFields.every((f) => f.matched) ? "matched" : "not_matched";
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    categoryId: catId || undefined,
    categoryLabel: getCategoryLabel(catId, schemas),
    label,
    fieldData,
    parsedFields,
    parseMatch,
  };
}

function getAnnotationsForPage(): AnnotationInfo[] {
  const schemas = loadSchemas();
  const results: AnnotationInfo[] = [];
  const page = figma.currentPage;

  function walk(node: SceneNode) {
    if ("annotations" in node && node.annotations && node.annotations.length > 0) {
      for (const ann of node.annotations) {
        results.push(buildAnnotationInfo(node, ann, schemas));
      }
    }

    if ("children" in node) {
      for (const child of (node as ChildrenMixin).children) {
        walk(child as SceneNode);
      }
    }
  }

  for (const child of page.children) {
    walk(child);
  }

  return results;
}

function emitSelectionInfo(): void {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1) {
    emit<SelectionChangedHandler>("SELECTION_CHANGED", {
      nodeId: null,
      nodeName: "",
      nodeType: "",
      annotations: [],
    });
    return;
  }

  const node = sel[0];
  const schemas = loadSchemas();
  const annotations: AnnotationInfo[] = [];

  if ("annotations" in node && node.annotations) {
    for (const ann of node.annotations) {
      annotations.push(buildAnnotationInfo(node, ann, schemas));
    }
  }

  emit<SelectionChangedHandler>("SELECTION_CHANGED", {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    annotations,
  });
}

// --- Main ---

export default async function () {
  showUI({ width: 360, height: 560 });

  // UI signals ready → push initial data
  on<UIReadyHandler>("UI_READY", async () => {
    await ensureCategoriesLoaded();
    emit<CategoriesListHandler>("CATEGORIES_LIST", { categories: cachedCategories });
    emit<SchemasLoadedHandler>("SCHEMAS_LOADED", { schemas: loadSchemas() });
    emit<AnnotationsListHandler>("ANNOTATIONS_LIST", { annotations: getAnnotationsForPage() });
    emitSelectionInfo();
  });

  // Selection changes
  figma.on("selectionchange", () => {
    emitSelectionInfo();
  });

  // UI → Plugin handlers
  on<GetAnnotationsHandler>("GET_ANNOTATIONS", () => {
    emit<AnnotationsListHandler>("ANNOTATIONS_LIST", { annotations: getAnnotationsForPage() });
  });

  on<GetSchemasHandler>("GET_SCHEMAS", () => {
    emit<SchemasLoadedHandler>("SCHEMAS_LOADED", { schemas: loadSchemas() });
  });

  on<SaveSchemasHandler>("SAVE_SCHEMAS", (data) => {
    saveSchemas(data.schemas);
    emit<SchemasLoadedHandler>("SCHEMAS_LOADED", { schemas: data.schemas });
  });

  on<ApplyAnnotationHandler>("APPLY_ANNOTATION", async (data) => {
    const node = await figma.getNodeByIdAsync(data.nodeId);
    if (!node || !("annotations" in node)) return;

    const existing = [...(node.annotations ?? [])];
    const idx = existing.findIndex((a) => a.categoryId === data.categoryId);

    const newAnn = {
      label: data.text,
      categoryId: data.categoryId,
    };

    if (idx >= 0) {
      existing[idx] = newAnn;
    } else {
      existing.push(newAnn);
    }

    const annotatable = node as FrameNode;
    annotatable.annotations = existing;

    const dataKey = annotationDataKey(data.categoryId);
    annotatable.setPluginData(dataKey, JSON.stringify(data.fieldData));

    emit<AnnotationAppliedHandler>("ANNOTATION_APPLIED");
    emitSelectionInfo();
  });

  on<DeleteAnnotationHandler>("DELETE_ANNOTATION", async (data) => {
    const node = await figma.getNodeByIdAsync(data.nodeId);
    if (!node || !("annotations" in node)) return;

    const filtered = (node.annotations ?? []).filter(
      (a) => a.categoryId !== data.categoryId
    );
    const annotatable = node as FrameNode;
    annotatable.annotations = filtered;

    const dataKey = annotationDataKey(data.categoryId);
    annotatable.setPluginData(dataKey, "");

    emit<AnnotationDeletedHandler>("ANNOTATION_DELETED");
    emitSelectionInfo();
  });

  on<SelectNodeHandler>("SELECT_NODE", async (data) => {
    const node = await figma.getNodeByIdAsync(data.nodeId);
    if (node && "type" in node) {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  });

  on<NavigateToNodeHandler>("NAVIGATE_TO_NODE", async (data) => {
    const node = await figma.getNodeByIdAsync(data.nodeId);
    if (node && "type" in node) {
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  });

  on<GetCategoriesHandler>("GET_CATEGORIES", async () => {
    await ensureCategoriesLoaded();
    emit<CategoriesListHandler>("CATEGORIES_LIST", { categories: cachedCategories });
  });
}
