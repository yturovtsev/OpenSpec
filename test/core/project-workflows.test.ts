import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { saveGlobalConfig } from '../../src/core/global-config.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { WORKFLOW_TO_SKILL_DIR } from '../../src/core/profile-sync-drift.js';
import {
  INIT_PROJECT_WORKFLOWS_ENV,
  readProjectWorkflows,
  resolveEffectiveWorkflows,
} from '../../src/core/project-workflows.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/ui/welcome-screen.js', () => ({
  showWelcomeScreen: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: vi.fn(),
}));

// A hand-picked global selection the project-declared set must win over.
const NARROW_GLOBAL = ['propose', 'apply'];

const sorted = (workflows: readonly string[]) => [...workflows].sort();

describe('project-declared workflows', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  async function writeProjectConfig(body: string): Promise<string> {
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, body);
    return configPath;
  }

  async function readProjectConfigText(): Promise<string> {
    return fs.readFile(path.join(testDir, 'openspec', 'config.yaml'), 'utf-8');
  }

  async function installedClaudeWorkflows(): Promise<string[]> {
    const skillsRoot = path.join(testDir, '.claude', 'skills');
    const dirs = await fs.readdir(skillsRoot).catch(() => [] as string[]);
    return Object.entries(WORKFLOW_TO_SKILL_DIR)
      .filter(([, dir]) => dirs.includes(dir))
      .map(([workflow]) => workflow)
      .sort();
  }

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-project-workflows-'));
    originalEnv = { ...process.env };
    configTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-config-project-workflows-'));
    process.env.XDG_CONFIG_HOME = configTempDir;
    process.env.CODEX_HOME = path.join(testDir, 'codex-home');
    process.env.HOME = path.join(testDir, 'home');
    process.env.USERPROFILE = path.join(testDir, 'home');
    // vitest.config.ts turns the init default off for the upstream suite.
    delete process.env[INIT_PROJECT_WORKFLOWS_ENV];

    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: NARROW_GLOBAL,
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('readProjectWorkflows', () => {
    it('returns undefined when the project has no config', () => {
      expect(readProjectWorkflows(testDir)).toBeUndefined();
    });

    it('returns undefined when the config does not declare workflows', async () => {
      await writeProjectConfig('schema: spec-driven\n');

      expect(readProjectWorkflows(testDir)).toBeUndefined();
    });

    it('expands `all` to every workflow OpenSpec ships', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: all\n');

      expect(readProjectWorkflows(testDir)).toEqual(ALL_WORKFLOWS);
    });

    it('reads a config.yml as well as a config.yaml', async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'openspec', 'config.yml'),
        'schema: spec-driven\nworkflows: [propose, apply]\n'
      );

      expect(sorted(readProjectWorkflows(testDir) ?? [])).toEqual(['apply', 'propose']);
    });

    it('applies the same dependency rules as a hand-picked global selection', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: [propose, archive]\n');

      expect(readProjectWorkflows(testDir)).toEqual(['propose', 'sync', 'archive']);
    });

    it('drops unknown workflow ids and says which', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: [propose, no-such-workflow]\n');

      expect(readProjectWorkflows(testDir)).toEqual(['propose']);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no-such-workflow'));
    });

    it('ignores an unusable value and says so', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: 3\n');

      expect(readProjectWorkflows(testDir)).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid 'workflows' field"));
    });

    it('reports the same problem once per run', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: {}\n');

      readProjectWorkflows(testDir);
      readProjectWorkflows(testDir);

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveEffectiveWorkflows', () => {
    const globalConfig = { profile: 'custom' as const, workflows: NARROW_GLOBAL };

    it('prefers the project-declared set over a hand-picked global selection', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: all\n');

      expect(resolveEffectiveWorkflows(testDir, globalConfig)).toEqual({
        workflows: ALL_WORKFLOWS,
        source: 'project',
      });
    });

    it('falls back to the global profile when the project declares nothing', async () => {
      await writeProjectConfig('schema: spec-driven\n');

      expect(resolveEffectiveWorkflows(testDir, globalConfig)).toEqual({
        workflows: NARROW_GLOBAL,
        source: 'global',
      });
    });

    it('lets an explicit --profile override win for that run', async () => {
      await writeProjectConfig('schema: spec-driven\nworkflows: all\n');

      expect(resolveEffectiveWorkflows(testDir, globalConfig, 'core')).toEqual({
        workflows: CORE_WORKFLOWS,
        source: 'global',
      });
    });
  });

  describe('openspec init', () => {
    it('declares every workflow in a new project and installs them, whatever the global profile', async () => {
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      expect(await readProjectConfigText()).toMatch(/^workflows: all$/m);
      expect(await installedClaudeWorkflows()).toEqual(sorted(ALL_WORKFLOWS));
    });

    it('does not declare workflows when --profile is given', async () => {
      await new InitCommand({ tools: 'claude', force: true, profile: 'core' }).execute(testDir);

      expect(await readProjectConfigText()).not.toMatch(/^workflows:/m);
      expect(await installedClaudeWorkflows()).toEqual(sorted(CORE_WORKFLOWS));
    });

    it(`does not declare workflows when ${INIT_PROJECT_WORKFLOWS_ENV}=0`, async () => {
      process.env[INIT_PROJECT_WORKFLOWS_ENV] = '0';

      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      expect(await readProjectConfigText()).not.toMatch(/^workflows:/m);
      expect(await installedClaudeWorkflows()).toEqual(sorted(NARROW_GLOBAL));
    });

    it('leaves an existing config alone and keeps following the global profile there', async () => {
      const existing = 'schema: spec-driven\n';
      await writeProjectConfig(existing);

      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      expect(await readProjectConfigText()).toBe(existing);
      expect(await installedClaudeWorkflows()).toEqual(sorted(NARROW_GLOBAL));
    });
  });

  describe('openspec update', () => {
    it('keeps the full set a new project declared, despite a narrower global profile', async () => {
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await installedClaudeWorkflows()).toEqual(sorted(ALL_WORKFLOWS));
    });

    it('narrows the project to the list its config declares', async () => {
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
      const config = await readProjectConfigText();
      await writeProjectConfig(config.replace(/^workflows: all$/m, 'workflows: [propose, explore, apply]'));

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await installedClaudeWorkflows()).toEqual(['apply', 'explore', 'propose']);
    });

    it('does not point at `openspec config profile` for a project-declared set', async () => {
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
      const config = await readProjectConfigText();
      await writeProjectConfig(config.replace(/^workflows: all$/m, 'workflows: [propose, apply]'));
      const logSpy = vi.mocked(console.log);
      logSpy.mockClear();

      await new UpdateCommand({ force: true }).execute(testDir);

      const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(output).not.toContain('openspec config profile');
    });
  });
});
