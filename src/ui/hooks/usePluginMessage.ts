import { emit } from '@create-figma-plugin/utilities'

// Thin wrapper for components that send messages to plugin.
// Maps old { type: 'X', ...data } pattern to cfp emit<Handler>('X', data).
// Components import this to avoid coupling to every Handler type.
// Phase 2 may remove this wrapper and use emit directly.

type PluginMessageMap = {
  GET_ANNOTATIONS: void
  GET_SCHEMAS: void
  GET_CATEGORIES: void
  SAVE_SCHEMAS: { schemas: import('@shared/types').SchemaStore }
  APPLY_ANNOTATION: { nodeId: string; categoryId: string; text: string; fieldData: import('@shared/types').FieldData }
  DELETE_ANNOTATION: { nodeId: string; categoryId: string }
  SELECT_NODE: { nodeId: string }
  NAVIGATE_TO_NODE: { nodeId: string }
}

export function postToPlugin<K extends keyof PluginMessageMap>(
  msg: PluginMessageMap[K] extends void
    ? { type: K }
    : { type: K } & PluginMessageMap[K]
): void {
  const { type, ...data } = msg as any
  if (Object.keys(data).length > 0) {
    emit(type, data)
  } else {
    emit(type)
  }
}
