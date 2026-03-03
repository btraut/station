# Lessons

## 2026-03-03

- When the user explicitly locks behavior (for example, "mirror CLI exactly"), stop asking follow-up behavior questions and switch immediately to implementation mode.
- Avoid adding umbrella commands when they collide conceptually with core lifecycle verbs (`install` vs `init`); prefer explicit namespaces (`skill`, `mcp`) unless the user asks for a top-level shortcut.
