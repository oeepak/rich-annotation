import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { on, emit } from '@create-figma-plugin/utilities'
import { OverviewTab } from "./components/OverviewTab";
import { SelectedTab } from "./components/SelectedTab";
import { SchemaTab } from "./components/SchemaTab";
import type {
  SelectionChangedHandler,
  SchemasLoadedHandler,
  AnnotationsListHandler,
  CategoriesListHandler,
  AnnotationAppliedHandler,
  AnnotationDeletedHandler,
  GetAnnotationsHandler,
  GetSchemasHandler,
  GetCategoriesHandler,
  SelectNodeHandler,
  UIReadyHandler,
} from "@shared/messages";
import type { SchemaStore, AnnotationInfo, AnnotationCategory } from "@shared/types";

type View = "auto" | "schema";

export function App() {
  const [view, setView] = useState<View>("auto");
  const [schemas, setSchemas] = useState<SchemaStore>({});
  const [categories, setCategories] = useState<AnnotationCategory[]>([]);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState("");
  const [selectedAnnotations, setSelectedAnnotations] = useState<AnnotationInfo[]>([]);

  // Overview state
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationInfo[]>([]);

  useEffect(() => {
    // Register all handlers before emitting UI_READY so we don't miss any response
    const unsubSelectionChanged = on<SelectionChangedHandler>('SELECTION_CHANGED', (data) => {
      setSelectedNodeId(data.nodeId);
      setSelectedNodeName(data.nodeName);
      setSelectedNodeType(data.nodeType);
      setSelectedAnnotations(data.annotations);
      setView("auto");
      // Refresh overview annotations
      emit<GetAnnotationsHandler>('GET_ANNOTATIONS');
    });

    const unsubSchemasLoaded = on<SchemasLoadedHandler>('SCHEMAS_LOADED', (data) => {
      setSchemas(data.schemas);
    });

    const unsubAnnotationsList = on<AnnotationsListHandler>('ANNOTATIONS_LIST', (data) => {
      setPageAnnotations(data.annotations);
    });

    const unsubCategoriesList = on<CategoriesListHandler>('CATEGORIES_LIST', (data) => {
      setCategories(data.categories);
    });

    const unsubAnnotationApplied = on<AnnotationAppliedHandler>('ANNOTATION_APPLIED', () => {
      emit<GetAnnotationsHandler>('GET_ANNOTATIONS');
    });

    const unsubAnnotationDeleted = on<AnnotationDeletedHandler>('ANNOTATION_DELETED', () => {
      emit<GetAnnotationsHandler>('GET_ANNOTATIONS');
    });

    // Signal plugin that UI is ready — plugin will send initial state
    emit<UIReadyHandler>('UI_READY');

    return () => {
      unsubSelectionChanged();
      unsubSchemasLoaded();
      unsubAnnotationsList();
      unsubCategoriesList();
      unsubAnnotationApplied();
      unsubAnnotationDeleted();
    };
  }, []);

  const goToSchema = () => {
    emit<GetSchemasHandler>('GET_SCHEMAS');
    emit<GetCategoriesHandler>('GET_CATEGORIES');
    setView("schema");
  };

  const goBack = () => {
    setView("auto");
  };

  // Schema view
  if (view === "schema") {
    return (
      <div className="plugin-container">
        <SchemaTab
          schemas={schemas}
          categories={categories}
          onBack={goBack}
        />
      </div>
    );
  }

  // Auto view: no selection → overview, selection → selected
  if (!selectedNodeId) {
    return (
      <div className="plugin-container">
        <OverviewTab
          annotations={pageAnnotations}
          schemas={schemas}
          categories={categories}
          onEdit={(nodeId) => {
            emit<SelectNodeHandler>('SELECT_NODE', { nodeId });
          }}
        />
      </div>
    );
  }

  return (
    <div className="plugin-container">
      <SelectedTab
        nodeId={selectedNodeId}
        nodeName={selectedNodeName}
        nodeType={selectedNodeType}
        annotations={selectedAnnotations}
        schemas={schemas}
        categories={categories}
        onGoToSchema={goToSchema}
      />
    </div>
  );
}
