---
"@fission-ai/openspec": minor
---

Add `openspec init --context-profile <name>`, which records this repository's MCP context profile as the last line of the project context in `openspec/config.yaml`, so agents receive it with every artifact instruction. Unlike `--language`, the option also updates an existing config: only the `context` field is rewritten, and comments, `rules`, and every other field are preserved. Re-running with the same profile changes nothing, and a different profile replaces the recorded line instead of adding a second one.
