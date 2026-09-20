/**
 * GigaCode CLI Command Adapter
 *
 * GigaCode CLI reads the same Markdown command format as Qwen Code: a file per
 * command, carrying a `description` frontmatter field, named by the command it
 * registers. Only the directory differs, so this adapter is deliberately a
 * separate module rather than a re-export — if the two formats ever diverge,
 * the change lands here without touching the Qwen adapter.
 *
 * Because the filename carries the `opsx-` prefix, the generator classifies
 * these commands as filename-invoked and rewrites `/opsx:<id>` references to
 * `/opsx-<id>` in both commands and skills. That follows from the path alone;
 * nothing here declares it.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * GigaCode CLI adapter for command generation.
 * File path: .gigacode/commands/opsx-<id>.md
 * Format: Markdown with description frontmatter
 */
export const gigacodeAdapter: ToolCommandAdapter = {
  toolId: 'gigacode',

  getFilePath(commandId: string): string {
    return path.join('.gigacode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
