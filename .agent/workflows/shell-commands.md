---
description: PowerShell command chaining rules
---

# PowerShell Command Chaining

**IMPORTANT**: This project runs on Windows with PowerShell.

- Use `;` to chain commands, NOT `&&`
- `&&` is NOT a valid statement separator in PowerShell
- Example: `git add -A; git status` (correct)
- Example: `git add -A && git status` (WRONG - will error)
