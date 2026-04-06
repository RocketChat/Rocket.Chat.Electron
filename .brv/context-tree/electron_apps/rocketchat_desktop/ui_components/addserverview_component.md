---
title: AddServerView Component
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:26:22.031Z'
updatedAt: '2026-04-04T18:26:22.031Z'
---
## Raw Concept
**Task:**
AddServerView component - form for adding new Rocket.Chat server to desktop app

**Changes:**
- Component renders conditionally when currentView === "add-new-server"
- Uses async request/response pattern over Redux for URL resolution
- Validation states: idle → validating → invalid/ok
- Handles online/offline status via navigator.onLine and window events

**Files:**
- src/ui/components/AddServerView/index.tsx

**Flow:**
visibility check → form render → input change → form submit → URL validation → server added action dispatch

## Narrative
### Structure
AddServerView is a form component in src/ui/components/AddServerView/index.tsx. It wraps form elements in a Fuselage Tile with FieldGroup layout. Visibility is controlled by Redux selector checking currentView state.

### Dependencies
Redux (useSelector, useDispatch), React (useState, useCallback, useEffect, useMemo, useId), @rocket.chat/fuselage UI library, @rocket.chat/fuselage-hooks (useAutoFocus), react-i18next for translations, ServerUrlResolutionStatus enum from servers/common

### Highlights
Async request/response pattern using request() store helper. Multi-state validation UI with dynamic button text. Online/offline detection with user-facing callout. Bidirectional text support via dir="auto". Automatic input focus when visible via useAutoFocus hook.

### Rules
Rule 1: Component only renders when currentView === "add-new-server"
Rule 2: Empty input defaults to urls.open constant
Rule 3: Validation states prevent button submission when validating or invalid
Rule 4: Offline status shows warning callout instead of form
Rule 5: Input is automatically focused when component becomes visible

## Facts
- **add_server_view_visibility**: AddServerView component displays when currentView === 'add-new-server' [project]
- **redux_async_pattern**: Uses request() store helper for async request/response pattern over Redux [project]
- **url_resolution_flow**: Dispatches SERVER_URL_RESOLUTION_REQUESTED action and awaits SERVER_URL_RESOLVED response [project]
- **validation_states**: Validation states: idle → validating → invalid/ok [project]
- **server_added_action**: On success dispatches ADD_SERVER_VIEW_SERVER_ADDED with resolved URL [project]
- **url_resolution_errors**: Error messages from ServerUrlResolutionStatus: INVALID_URL, INVALID, TIMEOUT [project]
- **default_server_url**: Default URL pre-filled from urls.open constant [project]
- **fuselage_components**: Uses Fuselage UI components: TextInput, Button, Callout, FieldGroup, Field, FieldLabel, FieldRow, ButtonGroup, Tile [project]
- **connection_status**: Monitors online/offline status via navigator.onLine and window online/offline events [project]
- **offline_state**: Shows offline callout when navigator.onLine is false [project]
- **auto_focus**: Uses useAutoFocus hook from @rocket.chat/fuselage-hooks for input focus management [project]
- **unique_id_generation**: Uses useId() hook for generating unique input ID [project]
- **url_input_placeholder**: Input placeholder shows defaultServerUrl.href [project]
- **button_text_states**: Button text changes based on validation state: 'connect' (idle), 'validating', 'invalidUrl' [project]
- **bidi_text_support**: TextInput dir='auto' attribute for bidirectional text support [project]
