# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**Figma API:**
- Figma Native API - Primary integration for design file manipulation
  - SDK/Client: Built-in `figma` global object (provided by Figma runtime)
  - Access method: Direct API calls via plugin code

## Data Storage

**Databases:**
- None - Plugin data persisted locally within Figma documents

**File Storage:**
- Figma Document Storage - Plugin data stored via `figma.root.setPluginData()`
  - Storage mechanism: Plugin data stored on Figma document root
  - Key format: Prefixed with `rich-annotation-` for namespacing
  - Data structure: JSON-serialized schema and annotation metadata

**Caching:**
- In-memory caching only
  - `cachedCategories` in `src/plugin/code.ts` - Annotation categories cache

## Authentication & Identity

**Auth Provider:**
- Figma Native Authentication - No additional auth layer required
  - Implementation: Plugin runs within authenticated Figma session
  - Access control: Inherits user's document access permissions

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service integrated

**Logs:**
- Console logging via `console` API (browser/plugin context)
- No structured logging framework detected

## CI/CD & Deployment

**Hosting:**
- Figma Plugin Marketplace - Distribution channel
- No separate web hosting

**CI Pipeline:**
- Not detected - No GitHub Actions, CircleCI, or similar CI configuration found

## Environment Configuration

**Required env vars:**
- None - Plugin requires no external environment variables

**Secrets location:**
- Not applicable - No external secrets management required

## Webhooks & Callbacks

**Incoming:**
- None - Plugin does not expose webhook endpoints

**Outgoing:**
- None - Plugin makes no outbound webhook calls
- Figma API calls are synchronous requests only
- Network access disabled: `allowedDomains: ["none"]` in plugin manifest

## Data Synchronization

**Plugin-to-UI Communication:**
- @create-figma-plugin/utilities event system
  - Bidirectional messaging via `emit()` and `on()` handlers
  - Message types defined in `src/shared/messages.ts`
  - No external API calls, purely local plugin-to-UI communication

**Document State Management:**
- Schema storage: `figma.root.setPluginData()` - Persistent plugin data
- Annotation data: Per-node storage via `node.setPluginData()` - Structured field data
- Selection state: Managed via `figma.currentPage.selection` and event listeners

---

*Integration audit: 2026-03-13*
