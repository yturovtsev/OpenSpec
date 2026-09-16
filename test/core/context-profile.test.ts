import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  MCP_CONTEXT_PROFILE_NAME,
  applyContextProfile,
  formatContextProfile,
  formatContextProfilePrefix,
  setContextProfileInConfigText,
} from '../../src/core/context-profile.js';

describe('context profile formatting', () => {
  it('names the MCP server and the profile', () => {
    expect(formatContextProfile('myApp')).toBe(
      `Если ты используешь mcp ${MCP_CONTEXT_PROFILE_NAME}, то твой контекстный профиль: myApp`
    );
  });

  it('keeps the lookup prefix and the formatted line in step', () => {
    // Detection is a prefix match, so the two must never drift apart.
    expect(formatContextProfile('anything').startsWith(formatContextProfilePrefix())).toBe(true);
  });
});

describe('applyContextProfile', () => {
  it('uses the line as the whole context when there is none', () => {
    expect(applyContextProfile(undefined, 'myApp')).toBe(formatContextProfile('myApp'));
    expect(applyContextProfile('', 'myApp')).toBe(formatContextProfile('myApp'));
  });

  it('appends the line after existing context', () => {
    const existing = 'Tech stack: TypeScript\nWe use conventional commits';

    expect(applyContextProfile(existing, 'myApp')).toBe(
      `${existing}\n${formatContextProfile('myApp')}`
    );
  });

  it('is a no-op when the same profile is already recorded', () => {
    const once = applyContextProfile('Tech stack: TypeScript', 'myApp');

    expect(applyContextProfile(once, 'myApp')).toBe(once);
  });

  it('replaces a previously recorded profile instead of stacking under it', () => {
    const before = applyContextProfile('Tech stack: TypeScript', 'myApp');
    const after = applyContextProfile(before, 'otherApp');

    expect(after).toBe('Tech stack: TypeScript\n' + formatContextProfile('otherApp'));
    expect(after).not.toContain('myApp');
  });

  it('keeps context that merely mentions the profile name', () => {
    const existing = 'The myApp service owns billing';

    expect(applyContextProfile(existing, 'myApp')).toBe(
      `${existing}\n${formatContextProfile('myApp')}`
    );
  });
});

describe('setContextProfileInConfigText', () => {
  const configWithContext = [
    'schema: spec-driven',
    '',
    'context: |',
    '  Tech stack: TypeScript',
    '',
    '# Per-artifact rules (optional)',
    'rules:',
    '  proposal:',
    '    - Keep proposals short',
    '',
  ].join('\n');

  it('adds the line to the context and leaves everything else alone', () => {
    const updated = setContextProfileInConfigText(configWithContext, 'myApp');

    expect(updated).toContain('# Per-artifact rules (optional)');
    expect(updated).toContain('    - Keep proposals short');

    const parsed = parseYaml(updated);
    expect(parsed.schema).toBe('spec-driven');
    expect(parsed.rules.proposal).toEqual(['Keep proposals short']);
    expect(parsed.context.trimEnd().split('\n').pop()).toBe(formatContextProfile('myApp'));
  });

  it('keeps the block scalar in clip style', () => {
    // `|-` instead of `|` would be a diff hunk that changes nothing.
    expect(setContextProfileInConfigText(configWithContext, 'myApp')).toContain('context: |\n');
  });

  it('gives a config without context one', () => {
    const updated = setContextProfileInConfigText('schema: spec-driven\n', 'myApp');

    expect(parseYaml(updated).context.trim()).toBe(formatContextProfile('myApp'));
    expect(parseYaml(updated).schema).toBe('spec-driven');
  });

  it('is byte-identical when the same profile is already recorded', () => {
    const once = setContextProfileInConfigText(configWithContext, 'myApp');

    expect(setContextProfileInConfigText(once, 'myApp')).toBe(once);
  });

  it('preserves CRLF line endings', () => {
    const crlf = configWithContext.split('\n').join('\r\n');
    const updated = setContextProfileInConfigText(crlf, 'myApp');

    expect(updated).toContain('\r\n');
    // No lone LF survives, which is what would show up as a whole-file diff.
    expect(updated.split('\r\n').join('')).not.toContain('\n');
    expect(parseYaml(updated).context).toContain(formatContextProfile('myApp'));
  });

  it('leaves an LF file on LF', () => {
    expect(setContextProfileInConfigText(configWithContext, 'myApp')).not.toContain('\r\n');
  });

  it('refuses a config that is not valid YAML', () => {
    expect(() => setContextProfileInConfigText('schema: spec-driven\ncontext: [unclosed\n', 'myApp')).toThrow();
  });

  it('refuses a config that is not a mapping', () => {
    expect(() => setContextProfileInConfigText('', 'myApp')).toThrow();
  });
});
