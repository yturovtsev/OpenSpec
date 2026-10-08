/**
 * Project Workflows
 *
 * Fork: a project can declare its own workflow set in openspec/config.yaml,
 * as `workflows: all` or a list of workflow ids. When declared, that set
 * replaces the global profile's for this project, so every clone generates
 * the same skills and commands no matter whose machine runs `openspec init`
 * or `openspec update`. Delivery stays a global setting. Without the key the
 * global profile applies unchanged, exactly as upstream.
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { GlobalConfig, Profile } from './global-config.js';
import { ALL_WORKFLOWS, getProfileWorkflows } from './profiles.js';
import { resolveConfigFilePath } from './project-config.js';

export const PROJECT_WORKFLOWS_KEY = 'workflows';
export const ALL_WORKFLOWS_VALUE = 'all';

/**
 * Set to '0' to keep `openspec init` from declaring workflows in a new
 * project's config. The upstream test suite runs with it off (vitest.config.ts)
 * so it keeps exercising the global-profile path it was written for.
 */
export const INIT_PROJECT_WORKFLOWS_ENV = 'OPENSPEC_INIT_PROJECT_WORKFLOWS';

/**
 * Appended to the config.yaml that `openspec init` creates, so a new project
 * starts on the full workflow set without anyone touching the global profile.
 */
export const PROJECT_WORKFLOWS_CONFIG_BLOCK = [
  '',
  '# Workflows installed for this project. `all` installs every workflow',
  '# OpenSpec ships; list ids to narrow it, e.g. [propose, explore, apply, sync, archive].',
  '# Takes precedence over the global profile (`openspec config profile`) here.',
  `${PROJECT_WORKFLOWS_KEY}: ${ALL_WORKFLOWS_VALUE}`,
  '',
].join('\n');

export interface EffectiveWorkflows {
  workflows: readonly string[];
  /** 'project' when openspec/config.yaml declares the set, 'global' otherwise. */
  source: 'project' | 'global';
}

// init resolves the set several times per run; say each problem once per config.
const reportedWarnings = new Set<string>();

function warnOnce(configPath: string, message: string): void {
  const key = `${configPath}\n${message}`;
  if (reportedWarnings.has(key)) return;
  reportedWarnings.add(key);
  console.warn(message);
}

/**
 * Reads the workflow set declared in the project's config.
 *
 * Returns undefined when the config is missing, has no `workflows` key, or
 * the value is unusable — the caller then falls back to the global profile.
 */
export function readProjectWorkflows(projectRoot: string): readonly string[] | undefined {
  const configPath = resolveConfigFilePath(projectRoot);
  if (configPath === null) {
    return undefined;
  }

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(configPath, 'utf-8'));
  } catch {
    // Unreadable or malformed configs are reported by readProjectConfig.
    return undefined;
  }

  if (!raw || typeof raw !== 'object' || !(PROJECT_WORKFLOWS_KEY in raw)) {
    return undefined;
  }

  const value = (raw as Record<string, unknown>)[PROJECT_WORKFLOWS_KEY];

  if (value === ALL_WORKFLOWS_VALUE) {
    return ALL_WORKFLOWS;
  }

  if (Array.isArray(value) && value.every((id) => typeof id === 'string')) {
    const known = value.filter((id) => (ALL_WORKFLOWS as readonly string[]).includes(id));
    const unknown = value.filter((id) => !(ALL_WORKFLOWS as readonly string[]).includes(id));
    if (unknown.length > 0) {
      warnOnce(
        configPath,
        `Ignoring unknown workflow id(s) in '${PROJECT_WORKFLOWS_KEY}' of openspec/config.yaml: ` +
          `${unknown.join(', ')}. Available: ${ALL_WORKFLOWS.join(', ')}`
      );
    }
    // Same dependency rules as a hand-picked global selection (archive needs sync).
    return getProfileWorkflows('custom', known);
  }

  warnOnce(
    configPath,
    `Invalid '${PROJECT_WORKFLOWS_KEY}' field in openspec/config.yaml ` +
      `(must be "${ALL_WORKFLOWS_VALUE}" or a list of workflow ids); using the global profile`
  );
  return undefined;
}

/**
 * Resolves the workflows to install in a project.
 *
 * An explicit --profile override wins for that run; otherwise a set declared
 * in the project's config wins over the global profile.
 */
export function resolveEffectiveWorkflows(
  projectRoot: string,
  globalConfig: Pick<GlobalConfig, 'profile' | 'workflows'>,
  profileOverride?: Profile
): EffectiveWorkflows {
  if (profileOverride === undefined) {
    const declared = readProjectWorkflows(projectRoot);
    if (declared !== undefined) {
      return { workflows: declared, source: 'project' };
    }
  }

  const profile: Profile = profileOverride ?? globalConfig.profile ?? 'core';
  return { workflows: getProfileWorkflows(profile, globalConfig.workflows), source: 'global' };
}

/**
 * Whether `openspec init` will write {@link PROJECT_WORKFLOWS_CONFIG_BLOCK}:
 * it creates the project's config, no --profile override was given, and
 * {@link INIT_PROJECT_WORKFLOWS_ENV} does not turn it off.
 */
export function initDeclaresProjectWorkflows(projectRoot: string, profileOverride?: Profile): boolean {
  return (
    process.env[INIT_PROJECT_WORKFLOWS_ENV] !== '0' &&
    profileOverride === undefined &&
    resolveConfigFilePath(projectRoot) === null
  );
}

/**
 * {@link resolveEffectiveWorkflows} for `openspec init`, which generates skills
 * before it creates config.yaml: a config it is about to create already
 * counts as declaring every workflow.
 */
export function resolveInitWorkflows(
  projectRoot: string,
  globalConfig: Pick<GlobalConfig, 'profile' | 'workflows'>,
  profileOverride?: Profile
): EffectiveWorkflows {
  if (initDeclaresProjectWorkflows(projectRoot, profileOverride)) {
    return { workflows: ALL_WORKFLOWS, source: 'project' };
  }
  return resolveEffectiveWorkflows(projectRoot, globalConfig, profileOverride);
}
