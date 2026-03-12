import type { UIMessage, PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo, FieldSchema, FieldData, ParsedField, ParseMatch } from "@shared/types";
import { parseText } from "@shared/parseText";
import { validateField } from "@shared/validateField";

const SCHEMA_KEY = "rich-annotation-schemas";

figma.showUI(__html__, { width: 360, height: 560, themeColors: true });

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

let cachedCategories: { id: string; label: string }[] = [];

async function ensureCategoriesLoaded(): Promise<void> {
  if (cachedCategories.length === 0) {
    const cats = await figma.annotations.getAnnotationCategoriesAsync();
    cachedCategories = cats.map((c) => ({ id: c.id, label: c.label }));
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

  // Try pluginData first (source of truth)
  const dataKey = `rich-annotation-data:${catId}`;
  const rawData = "getPluginData" in node ? (node as FrameNode).getPluginData(dataKey) : "";
  if (rawData) {
    try {
      fieldData = JSON.parse(rawData) as FieldData;
    } catch {}
  }

  if (schema) {
    if (fieldData) {
      parsedFields = buildParsedFieldsFromData(fieldData, schema.fields);
    } else {
      // Fallback: parse from label text (legacy annotations)
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

function buildParsedFieldsFromData(
  data: FieldData,
  schemaFields: FieldSchema[]
): ParsedField[] {
  return schemaFields.map((schema) => {
    const raw = data[schema.name];

    if (schema.type === "group") {
      const groupData = (typeof raw === "object" ? raw : {}) as Record<string, string>;
      const children = (schema.children ?? []).map((child) => {
        const childRaw = groupData[child.name] ?? "";
        const { parsedValue, matched } = validateField(childRaw, child);
        return { name: child.name, rawValue: childRaw, parsedValue, matched };
      });
      const groupMatched = children.every((c) => c.matched);
      return {
        name: schema.name,
        rawValue: "",
        parsedValue: null,
        matched: groupMatched,
        children,
      };
    }

    const rawValue = (typeof raw === "string" ? raw : "") as string;
    const { parsedValue, matched } = validateField(rawValue, schema);
    return { name: schema.name, rawValue, parsedValue, matched };
  });
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

function getSelectionInfo(): PluginMessage {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1) {
    return {
      type: "SELECTION_CHANGED",
      nodeId: null,
      nodeName: "",
      nodeType: "",
      annotations: [],
    };
  }

  const node = sel[0];
  const schemas = loadSchemas();
  const annotations: AnnotationInfo[] = [];

  if ("annotations" in node && node.annotations) {
    for (const ann of node.annotations) {
      annotations.push(buildAnnotationInfo(node, ann, schemas));
    }
  }

  return {
    type: "SELECTION_CHANGED",
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    annotations,
  };
}

// --- Message Handler ---

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case "INIT": {
      await ensureCategoriesLoaded();
      const info = getSelectionInfo();
      figma.ui.postMessage(info);
      break;
    }

    case "GET_SELECTION": {
      const info = getSelectionInfo();
      figma.ui.postMessage(info);
      break;
    }

    case "GET_ANNOTATIONS": {
      const annotations = getAnnotationsForPage();
      figma.ui.postMessage({
        type: "ANNOTATIONS_LIST",
        annotations,
      } satisfies PluginMessage);
      break;
    }

    case "GET_SCHEMAS": {
      const schemas = loadSchemas();
      figma.ui.postMessage({
        type: "SCHEMAS_LOADED",
        schemas,
      } satisfies PluginMessage);
      break;
    }

    case "SAVE_SCHEMAS": {
      saveSchemas(msg.schemas);
      figma.ui.postMessage({
        type: "SCHEMAS_LOADED",
        schemas: msg.schemas,
      } satisfies PluginMessage);
      break;
    }

    case "APPLY_ANNOTATION": {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node || !("annotations" in node)) break;

      const existing = [...(node.annotations ?? [])];
      const idx = existing.findIndex((a) => a.categoryId === msg.categoryId);

      const newAnn = {
        label: msg.text,
        categoryId: msg.categoryId,
      };

      if (idx >= 0) {
        existing[idx] = newAnn;
      } else {
        existing.push(newAnn);
      }

      const annotatable = node as FrameNode;
      annotatable.annotations = existing;

      // Store structured field data in pluginData
      const dataKey = `rich-annotation-data:${msg.categoryId}`;
      annotatable.setPluginData(dataKey, JSON.stringify(msg.fieldData));

      figma.ui.postMessage({ type: "ANNOTATION_APPLIED" } satisfies PluginMessage);
      figma.ui.postMessage(getSelectionInfo());
      break;
    }

    case "DELETE_ANNOTATION": {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node || !("annotations" in node)) break;

      const filtered = (node.annotations ?? []).filter(
        (a) => a.categoryId !== msg.categoryId
      );
      const annotatable = node as FrameNode;
      annotatable.annotations = filtered;

      // Remove stored field data
      const dataKey = `rich-annotation-data:${msg.categoryId}`;
      annotatable.setPluginData(dataKey, "");

      figma.ui.postMessage({ type: "ANNOTATION_DELETED" } satisfies PluginMessage);
      figma.ui.postMessage(getSelectionInfo());
      break;
    }

    case "SELECT_NODE": {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && "type" in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    }

    case "GET_CATEGORIES": {
      await ensureCategoriesLoaded();
      figma.ui.postMessage({
        type: "CATEGORIES_LIST",
        categories: cachedCategories,
      } satisfies PluginMessage);
      break;
    }
  }
};

// --- Selection Change Listener ---

figma.on("selectionchange", () => {
  figma.ui.postMessage(getSelectionInfo());
});
