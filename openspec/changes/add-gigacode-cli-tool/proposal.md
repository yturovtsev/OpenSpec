## Why

GigaCode CLI is the standard coding assistant for teams working in this fork, but it does not appear in the tool list `openspec init` offers, so every developer has to configure another tool and rename its directory by hand to get OpenSpec workflows. Because it is the expected assistant rather than one option among many, it should also arrive already selected on a first setup instead of waiting to be found in a list of forty-odd entries.

## What Changes

- Add GigaCode CLI to the tools `openspec init` can configure, installing OpenSpec skills and commands under `.gigacode/`.
- GigaCode CLI reads the same command file format as Qwen Code, so its commands are named by filename and invoked as `/opsx-<id>`.
- Pre-select GigaCode CLI when a project is being set up for the first time, and show it near the top of the tool list so the selection is visible rather than buried.
- Leave existing projects alone: when `openspec init` runs in a project that already has OpenSpec, GigaCode CLI is offered but not pre-selected, so adding a tool to a configured project stays a deliberate act.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ai-tool-paths`: add the path contract for GigaCode CLI — its project directory and the skill location derived from it.
- `command-generation`: add the command file contract for GigaCode CLI — the file path pattern and frontmatter shape its adapter produces.
- `cli-init`: state when a tool is pre-selected in the interactive tool list, and that a pre-selected tool is ordered where the user can see it.

## Impact

- `openspec init` tool list and its pre-selection behaviour.
- Tool metadata (`AI_TOOLS`) and the command adapter registry gain one entry each; a new adapter module is added.
- `openspec update` picks up the new tool through the same registry, with no separate change.
- Documentation: the supported tools reference gains a row.
- No change to any existing tool's generated output: GigaCode CLI is added alongside, not in place of, what is already generated.
