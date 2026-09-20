## Context

See proposal.md — Why.

GigaCode CLI consumes the same skill and command file format as Qwen Code. The practical proof is that renaming a fully generated `.qwen` directory to `.gigacode` yields a working GigaCode setup. That observation is what this design turns into a supported path, so nobody has to run the rename by hand.

Two constraints shape the approach:

- This repository is a corporate fork that rebases a patch stack onto upstream. Every file a patch touches is a file that can conflict on a sync, so patch surface is a first-class cost, not an afterthought.
- Tool selection in `openspec init` has no notion of a tool being the expected default. Pre-selection today is derived entirely from what is on disk: a tool is pre-selected if OpenSpec already configured it, or — on a first-time setup only — if its directory exists.

## Goals / Non-Goals

**Goals:**

- Generate `.gigacode` through the normal generation path, so `openspec update`, delivery modes, and profile changes apply to it with no special-casing.
- Give the tool list a way to express "this tool is the expected default here" that survives an upstream rebase with a small, readable diff.
- Keep the patch surface for this change disjoint from the workflow-default change, so the two can be rebased, reordered, or dropped independently.

**Non-Goals:**

- Changing which workflows are installed. That is a separate change (`default-all-workflows`); mixing it in here would couple two patches that otherwise touch no common file.
- Making the default configurable per project or per user. The default is a property of this fork.
- Upstreaming. If it happens later, the pre-selection flag is the part upstream would have to want; the adapter and tool entry are routine.

## Decisions

### An adapter, not a documented `mv`

The rename works today, so it is worth saying why it should not be the answer. A renamed directory is a one-time snapshot: it goes stale on the next `openspec update`, it depends on a second tool being configured first, and it leaves the user's `.qwen` in the project or gone depending on whether they copied or moved. Registering GigaCode CLI as a tool in its own right gets the same bytes from the normal path and keeps them current.

The generated content is genuinely tool-agnostic, which is what makes a thin adapter sufficient rather than a partial imitation. Three properties carry that:

1. Templates hold no tool directory. Nothing under the workflow templates refers to a tool's base directory, so no path has to be rewritten per tool.
2. Invocation style is derived from the file the adapter writes, not from the tool id. A filename carrying the `opsx-` prefix classifies the command as filename-invoked, which is what turns `/opsx:apply` into `/opsx-apply` in both commands and skills. An adapter writing `.gigacode/commands/opsx-<id>.md` inherits that with no tool-specific branch.
3. No ownership marker is written into a directory only one tool claims. The marker that records which tool owns a shared skills root is skipped when exactly one tool maps to that root. `.gigacode` is such a root, so its tree carries no tool identity at all.

Together these mean the adapter needs to differ from the Qwen adapter in exactly one respect — the directory it writes into.

**Alternative considered:** a shared factory producing both the Qwen and GigaCode adapters from a root path. Rejected for patch surface: it edits an upstream file that upstream also edits, to save a few lines in a new file that can never conflict. A standalone adapter module keeps the conflict-prone part of the diff down to registration.

### Pre-selection as tool metadata, not a hardcoded id

The selection rule needs to answer "is this tool the default here?" The two available shapes are a literal tool id in the selection logic, or a flag on the tool entry that the logic reads.

A flag wins on both counts that matter. It keeps the tool's identity in the tool list where every other fact about a tool already lives, so the fork carries one more field rather than one more branch. And it keeps the rule itself a general statement, which is a smaller and more stable edit against upstream than an `if` naming a tool.

The flag is consulted in exactly two places, and both are required — a default that is checked but invisible is worse than no default at all:

- The pre-selection decision, which already distinguishes first-time setup from extending a configured project. Per the specs, the flag applies only to first-time setup; the existing conditions for that are reused rather than restated.
- The list ordering, which currently promotes configured tools and then detected ones. A tool that is pre-selected without being either would otherwise sort into the general pool, leaving it checked but far down a list of forty-plus entries.

### Detection needs nothing new

A tool whose base directory is claimed by no other tool is reported as present as soon as that directory exists. So a developer who already has `.gigacode` gets the existing detected-tool behaviour for free, and this change only decides what happens when the directory is absent. No new detection path is introduced; the existing tool metadata is what detection reads.

### The directory is created by generation

Nothing needs to prepare `.gigacode` before generation runs. Writing a generated file creates its parent directories, so selecting the tool is what brings the directory into existence. Any setup GigaCode CLI itself requires beyond the files OpenSpec writes belongs in the tool entry's setup note, which `init` and `update` already display — the same mechanism Hermes uses.

## Risks / Trade-offs

**The tool list is a single array upstream appends to → the entry conflicts on syncs.** Unavoidable for any new tool. Placing the entry at a position that reflects the fork's ordering intent and keeping it to one line makes each conflict a one-line resolution rather than a merge to reason about.

**A pre-selected tool can be accepted without being noticed.** Someone pressing Enter through the prompt gets `.gigacode` whether or not they use GigaCode CLI. Mitigated by scoping the default to first-time setup, where an empty project is about to gain generated directories anyway, and by the ordering rule that puts the selection where it is read. The cost of a wrong guess is an unused directory, not a broken project.

**Assuming GigaCode CLI tracks the Qwen format forever.** If the formats diverge, the shared shape stops being an implementation detail and becomes a bug. The standalone adapter module is what contains that: the formatting lives in one file that can change without touching the Qwen adapter.

**Platform behaviour.** Both the skills path and the command path are composed with `path.join()`, so they resolve identically on macOS, Linux, and Windows. The directory name is fixed and lowercase, so a case-insensitive filesystem has nothing to reconcile.

## Migration Plan

Additive. Existing projects are untouched until someone runs `openspec init` or `openspec update` and selects GigaCode CLI. A developer who previously did the manual rename already has `.gigacode` on disk with content matching what generation produces; the tool is detected, and the first `openspec update` refreshes the tree in place rather than duplicating it.

Rollback is dropping the patch from the stack. Already-generated `.gigacode` directories are left behind, which is the same outcome as deselecting any other tool.
