import type { UIMessage, PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo, ParseMatch } from "@shared/types";
import { parseText } from "@shared/parseText";

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

// --- Annotation Helpers ---

function getAnnotationsForPage(): AnnotationInfo[] {
  const schemas = loadSchemas();
  const results: AnnotationInfo[] = [];
  const page = figma.currentPage;

  function walk(node: SceneNode) {
    if ("annotations" in node && node.annotations && node.annotations.length > 0) {
      for (const ann of node.annotations) {
        const catId = ann.categoryId ?? "";
        const label = ann.label ?? "";
        const schema = schemas[catId];

        let parsedFields: AnnotationInfo["parsedFields"] = [];
        let parseMatch: ParseMatch = "no_schema";

        if (schema) {
          const result = parseText(label, schema.fields);
          parsedFields = result.fields;
          parseMatch = result.parseMatch;
        }

        results.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          categoryId: catId || undefined,
          categoryLabel: schema?.categoryLabel ?? catId,
          label,
          parsedFields,
          parseMatch,
        });
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
      const catId = ann.categoryId ?? "";
      const label = ann.label ?? "";
      const schema = schemas[catId];

      let parsedFields: AnnotationInfo["parsedFields"] = [];
      let parseMatch: ParseMatch = "no_schema";

      if (schema) {
        const result = parseText(label, schema.fields);
        parsedFields = result.fields;
        parseMatch = result.parseMatch;
      }

      annotations.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        categoryId: catId || undefined,
        categoryLabel: schema?.categoryLabel ?? catId,
        label,
        parsedFields,
        parseMatch,
      });
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
    case "INIT":
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

      figma.ui.postMessage({ type: "ANNOTATION_APPLIED" } satisfies PluginMessage);
      // Refresh selection info
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
      const categories = await figma.annotations.getAnnotationCategoriesAsync();
      figma.ui.postMessage({
        type: "CATEGORIES_LIST",
        categories: categories.map((c) => ({ id: c.id, label: c.label })),
      } satisfies PluginMessage);
      break;
    }
  }
};

// --- Selection Change Listener ---

figma.on("selectionchange", () => {
  figma.ui.postMessage(getSelectionInfo());
});
