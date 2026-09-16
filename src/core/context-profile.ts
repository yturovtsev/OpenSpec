/**
 * MCP Context Profile
 *
 * `openspec init --context-profile <name>` records which MCP context profile
 * belongs to this repository. The record is a single line at the end of the
 * project context that agents already receive with every artifact instruction,
 * so nothing new is needed on the read side.
 *
 * Every helper here is a pure string transform: the init command owns the
 * filesystem, these own the text.
 */

import { isScalar, parseDocument, Scalar } from 'yaml';

/**
 * The MCP server named in the recorded guidance.
 *
 * Placeholder value — replace it with the real server name. This literal is
 * prompt text agents read, so it is tracked here by name rather than built at
 * each call site.
 */
export const MCP_CONTEXT_PROFILE_NAME = 'MCP_NAME';

/**
 * Everything up to the profile value. Doubles as the lookup key for a line a
 * previous run wrote, so detection never needs a pattern match.
 */
export function formatContextProfilePrefix(): string {
  return `Если ты используешь mcp ${MCP_CONTEXT_PROFILE_NAME}, то твой контекстный профиль: `;
}

/** The full line recorded in the project context. */
export function formatContextProfile(profile: string): string {
  return `${formatContextProfilePrefix()}${profile}`;
}

/**
 * Returns `context` with the profile line as its last line.
 *
 * Any line this helper wrote before is dropped first, so re-running with the
 * same profile is a no-op and a different profile replaces the old line
 * instead of stacking under it.
 */
export function applyContextProfile(context: string | undefined, profile: string): string {
  const prefix = formatContextProfilePrefix();
  const kept = (context ?? '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith(prefix));

  // Removing the old line can leave the blank lines that surrounded it.
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') {
    kept.pop();
  }

  const line = formatContextProfile(profile);
  return kept.length === 0 ? line : `${kept.join('\n')}\n${line}`;
}

/**
 * Dominant line ending of `content`, so a rewrite does not flip a CRLF file to
 * LF and produce a whole-file diff on Windows.
 */
function detectLineEnding(content: string): '\r\n' | '\n' {
  const total = (content.match(/\n/g) ?? []).length;
  if (total === 0) return '\n';
  const crlf = (content.match(/\r\n/g) ?? []).length;
  return crlf * 2 >= total ? '\r\n' : '\n';
}

/**
 * Returns `content` — the text of an existing `config.yaml` — with the profile
 * recorded in its `context` field.
 *
 * Only the `context` node is rewritten. Comments, key order, and every other
 * field survive, which rules out a parse-and-reserialize: comments are not part
 * of the parsed value, and OpenSpec's own generated config is mostly comments.
 *
 * @throws if the content is not a YAML mapping — a caller that cannot parse the
 * config must fail before writing rather than replace it with a fresh one.
 */
export function setContextProfileInConfigText(content: string, profile: string): string {
  const lineEnding = detectLineEnding(content);
  const doc = parseDocument(content.split('\r\n').join('\n'));

  if (doc.errors.length > 0) {
    throw new Error(doc.errors[0].message);
  }
  if (!doc.contents || typeof doc.get !== 'function') {
    throw new Error('the config file is not a YAML mapping');
  }

  const existing = doc.get('context', true);
  const current = isScalar(existing) && typeof existing.value === 'string'
    ? existing.value
    : undefined;
  // Keep the trailing newline that gives a block scalar its `|` (clip) style.
  // Without it the node re-renders as `|-`, a diff hunk that means nothing:
  // the injected context is trimmed before it ever reaches an agent.
  const next = `${applyContextProfile(current, profile)}\n`;

  if (isScalar(existing)) {
    // Mutating in place keeps any comment attached to the node.
    existing.value = next;
    existing.type = Scalar.BLOCK_LITERAL;
  } else {
    const node = doc.createNode(next) as Scalar;
    node.type = Scalar.BLOCK_LITERAL;
    doc.set('context', node);
  }

  const rendered = doc.toString({ lineWidth: 0 });
  return lineEnding === '\r\n' ? rendered.split('\n').join('\r\n') : rendered;
}
