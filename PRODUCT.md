# Product

## Register

product

## Users

Enterprise knowledge workers who keep Rocket.Chat open all day, often in the background. Many work inside regulated or self-hosted environments (government, healthcare, finance, on-prem IT). A meaningful subset are power users juggling multiple Rocket.Chat workspaces (work + community + customer tenants) and depend on the desktop client for fast cross-server switching, OS-level notifications, and native integrations the browser cannot offer.

Primary context: long-session use on a work machine, alongside other native apps. Users alt-tab in and out; they do not study the chrome, they reach for it.

## Product Purpose

Rocket.Chat Desktop is the native shell around one or more Rocket.Chat server webviews. Its job is to make managing multiple workspaces fast: server list switching, notification badges, deep links, certificate handling, screen sharing, downloads, tray presence, auto-update. The webview is the chat product; the desktop client is the connective tissue that makes running several at once feel like one tool instead of several browser tabs.

Success looks like: users forget the shell exists during normal use, and reach for it instinctively the moment they need to switch servers, recover from a stuck webview, or configure something the browser cannot do.

## Brand Personality

Reliable, professional, focused. Voice is plain and unornamented: short labels, no marketing flourishes, no playful microcopy. The interface should feel like a tool an IT admin would trust on a regulated network, while remaining warm enough for end users who live in it eight hours a day. Confident, not loud. Capable, not clever.

## Anti-references

- **Discord / gamer chat aesthetics.** Neon accents, drenched dark purple, playful empty states, animated reactions in chrome. Wrong register for enterprise and public sector.
- **Old Skype / legacy Teams chrome.** Heavy gradients, layered drop shadows, busy toolbars, decorative iconography in titlebars. Dated, visually noisy, undermines trust.
- **Generic SaaS marketing patterns inside the app.** Gradient hero numbers, identical icon-and-title card grids, "modern dashboard" aesthetics. The desktop shell is not a marketing surface.
- **Pure brand minimalism (Linear-empty for its own sake).** Multi-server power users need information density in the sidebar. Sparse-for-sparseness-sake hides the value of the shell.

## Design Principles

1. **Shell disappears, servers shine.** Desktop chrome must not compete with the webview. Sidebar, titlebar, and dialogs exist to switch, notify, and configure, then recede. If a chrome element draws the eye during normal chat use, it is wrong.

2. **Density without clutter.** Multi-workspace power users need many servers and signals visible at once. Earn every pixel: tight rhythm, considered hierarchy, no decorative padding. Density and clarity are compatible; sparse is not automatically better.

3. **Native, not web-pretending.** Respect OS conventions per platform: macOS traffic lights and vibrancy, Windows titlebar buttons and Mica, Linux menubar fallbacks. The desktop edge over the browser IS the native feel. Cross-platform consistency matters less than per-platform correctness.

4. **Trust through restraint.** Enterprise, government, and healthcare users need confidence. No surprises, no flourishes, no theatrical motion. Predictable beats clever. Errors are quiet and actionable, not dramatic.

5. **Fuselage first, custom last.** Visual coherence with the Rocket.Chat web app is a feature for users who move between web and desktop. Use `@rocket.chat/fuselage` primitives by default. Introduce custom components only where the desktop shell has no web equivalent (server sidebar, native dialogs, platform-specific affordances).

## Accessibility & Inclusion

Target: **WCAG 2.2 AA**, with attention to extras commonly required by Rocket.Chat's public sector and healthcare deployments.

- Full keyboard navigation across the shell (sidebar, menus, dialogs). No mouse-only affordances.
- Screen reader labels on every interactive shell element, including server sidebar entries and notification badges.
- Honor `prefers-reduced-motion` for all shell motion (sidebar transitions, dialog enters, badge animations).
- Honor system-level high contrast and forced colors on Windows.
- Contrast meets 2.2 AA against the active theme; verify against both light and dark.
- Do not rely on color alone to convey state (unread, error, connecting). Always pair with shape, icon, or text.
- Color-vision-deficient safe accent choices when introducing new status colors.
