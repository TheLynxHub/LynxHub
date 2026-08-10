import {execSync} from 'node:child_process';
import {platform} from 'node:os';
import {resolve} from 'node:path';

import {EXTENSION_API_VERSION, LYNXHUB_WEBSITE, MODULE_API_VERSION} from '@lynx_common/consts';
import {SubscribeStages} from '@lynx_common/types';
import {
  PluginEngines,
  PluginItem,
  PluginSyncItem,
  PluginVersions,
  VersionItem,
  VersionItemValidated,
} from '@lynx_common/types/plugins';
import {getUpdateType} from '@lynx_common/utils/plugins';
import GitManager from '@lynx_main/git';
import classHolder from '@lynx_main/managers/classHolder';
import {getAppDataPath, selectNewAppDataFolder} from '@lynx_main/managers/dataFolder';
import {RelaunchApp} from '@lynx_main/utils';
import axios from 'axios';
import {promises} from 'graceful-fs';
import {rcompare, satisfies, valid} from 'semver';

import ShowToastWindow from '../childWindows/toast';

/**
 * Finds the target version compatible with the given type and stage.
 * Sorts versions by semver descending to ensure the newest compatible version is chosen.
 * @param versions - List of available versions.
 * @param type - The type of plugin (module or extension).
 * @param stage - The subscription stage.
 * @returns The compatible version item or undefined.
 */
export function getTargetVersion(versions: PluginVersions, type: 'module' | 'extension', stage: SubscribeStages) {
  const sorted = [...versions].sort((a, b) => {
    const vA = valid(a.version) ? a.version : '0.0.0';
    const vB = valid(b.version) ? b.version : '0.0.0';
    return rcompare(vA, vB);
  });
  return sorted.find(version => isVersionCompatible(version, type, stage).compatible);
}

/**
 * Retrieves the version string associated with a specific commit hash.
 * @param id - The plugin ID.
 * @param commit - The commit hash.
 * @returns The version string or undefined.
 */
export async function getVersionByCommit(id: string, commit: string) {
  const {staticManager} = classHolder;
  const versioning = await staticManager?.getPluginVersioningById(id);
  if (!versioning) return undefined;
  return versioning.versions.find(v => v.commit === commit)?.version;
}

/**
 * Checks if an update is available and determines if it's an upgrade or downgrade.
 * @param id - Plugin ID.
 * @param currentCommit - The commit hash currently installed.
 * @param stage - The target subscription stage.
 * @returns A PluginSyncItem if an update is available, otherwise undefined.
 */
export async function isSyncRequired(
  id: string,
  currentVersion: string,
  stage: SubscribeStages,
): Promise<PluginSyncItem | undefined> {
  const {staticManager} = classHolder;
  const versioning = await staticManager?.getPluginVersioningById(id);
  const metadata = await staticManager?.getPluginMetadataById(id);

  if (!versioning || !metadata) return undefined;

  const targetVersion = getTargetVersion(versioning.versions, metadata.type, stage);

  if (!targetVersion) return undefined;

  const {version, commit} = targetVersion;

  const updateType = getUpdateType(versioning.versions, currentVersion, version);

  if (currentVersion === version || !updateType) return undefined;

  return {
    id,
    type: updateType,
    version,
    commit: commit || version,
  };
}

/**
 * Gets the target version string for a plugin based on the current app stage.
 * @param id - The plugin ID.
 * @returns The version string or undefined.
 */
export async function getTargetVersionByAppStage(id: string) {
  const {staticManager} = classHolder;
  const versioning = await staticManager!.getPluginVersioningById(id);
  const metadata = await staticManager!.getPluginMetadataById(id);

  if (!versioning || !metadata) return undefined;

  const stage = await staticManager!.getCurrentAppState();

  return getTargetVersion(versioning.versions, metadata.type, stage)?.version;
}

/**
 * Gets the target commit/version hash for a plugin based on the current app stage.
 * @param id - The plugin ID.
 * @returns The version or commit hash or undefined.
 */
export async function getCommitByAppStage(id: string) {
  return getTargetVersionByAppStage(id);
}

/**
 * Shows a toast warning about dubious Git ownership.
 */
export function showGitOwnershipToast() {
  ShowToastWindow(
    {
      buttons: ['exit'],
      customButtons: [
        {id: 'add_safe', color: 'danger-soft', label: 'Add to Safe Directories'},
        {id: 'change_data_dir', color: 'primary', label: 'Change Data Directory'},
      ],
      title: 'Git Ownership Warning',
      message:
        'Git has detected dubious ownership of the data directory. This can happen when the repository is owned by ' +
        "a different user. You can either add data directory to Git's safe directories or choose a different " +
        'location.',
      type: 'warning',
    },
    (id, window) => {
      if (id === 'add_safe') {
        const DataDirectory = getAppDataPath();
        execSync(`git config --global --add safe.directory '${DataDirectory}/*'`);
      } else if (id === 'change_data_dir') {
        selectNewAppDataFolder(window)
          .then(() => RelaunchApp(false))
          .catch(() => console.error('Error changing data directory'));
      }
    },
  );
}

/**
 * Removes old installations from a folder and returns the list of remote URLs found.
 * @param folder - The folder to clean up.
 * @returns A list of remote URLs of the removed installations.
 */
export async function removeOldInstallations(folder: string) {
  const oldInstallations: string[] = [];

  // Store already installed plugins
  try {
    const entries = await promises.readdir(folder, {withFileTypes: true});

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdirPath = resolve(folder, entry.name);
        try {
          const url = await GitManager.getRemoteUrlFromDirectory(subdirPath);
          if (url) oldInstallations.push(url);
        } catch (e) {
          // Ignore subdirectories that are not Git repositories or where the remote cannot be determined
          console.warn(`Could not determine remote URL for ${subdirPath}:`, e);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to read plugin directory ${folder}:`, error);
  }

  // Remove old installations
  try {
    await promises.rm(folder, {recursive: true, force: true});
  } catch (error) {
    console.error(`Failed to clean directory ${folder}:`, error);
    throw error;
  }

  return oldInstallations;
}

/**
 * Checks compatibility based on subscription stage.
 */
function checkSubscriptionStageCompatibility(
  version: VersionItem,
  currentStage: SubscribeStages,
): {compatible: boolean; reason: string | undefined} {
  if (currentStage === 'insider') return {compatible: true, reason: undefined};

  if (currentStage === 'early_access' && version.stage === 'insider') {
    return {
      compatible: false,
      reason:
        `Version ${version.version} is only available for Insider subscribers.` +
        `\nPlease upgrade your plan to get access.`,
    };
  }

  if (currentStage === 'public' && version.stage !== 'public') {
    const requiredStage = version.stage === 'insider' ? 'Insider' : 'Early Access';
    return {
      compatible: false,
      reason:
        `Version ${version.version} requires an ${requiredStage} or higher subscription.` +
        `\nPlease upgrade your plan to get access.`,
    };
  }

  return {compatible: true, reason: undefined};
}

/**
 * Checks compatibility based on the operating system platform.
 */
function checkPlatformCompatibility(version: Pick<VersionItem, 'platforms' | 'version'>): {
  compatible: boolean;
  reason: string | undefined;
} {
  const currentPlatform = platform();
  const platforms = version.platforms;

  if (!platforms || !platforms.includes(currentPlatform)) {
    const supportedPlatforms = platforms?.join(', ') || 'none';
    return {
      compatible: false,
      reason:
        `Version ${version.version} is not compatible with your operating system` +
        `\n(${currentPlatform}). It only supports: ${supportedPlatforms}.`,
    };
  }

  return {compatible: true, reason: undefined};
}

/**
 * Checks compatibility based on the API version (engines).
 */
function checkApiVersionCompatibility(
  version: VersionItem,
  type: 'module' | 'extension',
): {compatible: boolean; reason: string | undefined} {
  const engines = version.engines;

  if (!engines || typeof engines !== 'object') {
    return {
      compatible: false,
      reason: `Could not find compatibility information for version ${version.version}.`,
    };
  }

  const isExtension = type === 'extension';
  const apiType = isExtension ? 'extensionApi' : 'moduleApi';
  const currentApiVersion = isExtension ? EXTENSION_API_VERSION : MODULE_API_VERSION;

  const requiredRange = engines[apiType as keyof PluginEngines];

  if (!requiredRange) {
    return {
      compatible: false,
      reason:
        `Could not verify compatibility for version ${version.version}.` +
        `\nThe package metadata may be missing or corrupted.`,
    };
  }

  if (!satisfies(currentApiVersion, requiredRange)) {
    return {
      compatible: false,
      reason:
        `Version ${version.version} requires a different application version.` +
        `\nIt needs ${type} api version ${requiredRange}, but current version api is ${currentApiVersion}.`,
    };
  }

  return {compatible: true, reason: undefined};
}

/**
 * Checks if a version is compatible with the current environment.
 * @param version - The version item to check.
 * @param type - The type of plugin.
 * @param currentStage - The current subscription stage.
 * @returns Compatibility status and reason.
 */
export function isVersionCompatible(
  version: VersionItem,
  type: 'module' | 'extension',
  currentStage: SubscribeStages,
): {compatible: boolean; reason: string | undefined} {
  const checks = [
    () => checkPlatformCompatibility(version),
    () => checkApiVersionCompatibility(version, type),
    () => checkSubscriptionStageCompatibility(version, currentStage),
  ];

  for (const check of checks) {
    const result = check();
    if (!result.compatible) return result;
  }

  return {compatible: true, reason: undefined};
}

/**
 * Gets the list of available plugins for the current stage.
 * @param currentStage - The current subscription stage.
 * @returns A list of plugin items.
 */
export async function getList(currentStage: SubscribeStages): Promise<PluginItem[]> {
  const {staticManager} = classHolder;

  const list = await staticManager!.getPluginsList();
  const validated: PluginItem[] = [];

  let downloadsRes: Record<string, number> = {};
  try {
    const res = await axios.get(`${LYNXHUB_WEBSITE}/api/plugins/downloads`, {timeout: 3000});
    if (res.status === 200) {
      downloadsRes = res.data;
    }
  } catch (e: any) {
    console.warn('Failed to fetch download counts in main process:', e.message);
  }

  for (const item of list) {
    const versions: VersionItemValidated[] = item.versioning.versions.map(v => {
      const {compatible: isCompatible, reason: incompatibleReason} = isVersionCompatible(
        v,
        item.metadata.type,
        currentStage,
      );
      return {...v, isCompatible, incompatibleReason};
    });

    const isCompatible = versions.some(v => v.isCompatible);
    let incompatibleReason: string | undefined = undefined;

    if (!isCompatible) {
      const platformCompatibleVersion = versions.find(v => checkPlatformCompatibility(v).compatible);
      if (platformCompatibleVersion) {
        incompatibleReason = platformCompatibleVersion.incompatibleReason;
      } else {
        incompatibleReason = versions[0]?.incompatibleReason;
      }
    }

    validated.push({
      isCompatible,
      metadata: item.metadata,
      url: item.url,
      versions,
      incompatibleReason,
      changes: item.versioning.changes,
      downloadsCount: downloadsRes[item.metadata.id] || 0,
    });
  }

  return validated;
}
