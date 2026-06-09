# Generic Quest — Claude Code Instructions

## Auto-commit after every revision

After **every prompt that results in any code change**, immediately run:

```
git add -A && git commit -m "<short description of what changed>"
```

This is required so David can revert to the state before any specific prompt.
Do this before considering the task complete, every single time, no exceptions.
