import type {OsPlatforms, SubscribeStages} from '../index';

/**
 * Definition of engines supported by a plugin.
 */
export type PluginEngines = {
  /** The required version of the module API. */
  moduleApi?: string;
  /** The required version of the extension API. */
  extensionApi?: string;
};

/**
 * A sub-item in a changelog, which can be a string description or a nested list of items.
 */
export type ChangelogSubItem = string | Record<string, ChangelogSubItem[]>;

/**
 * A collection of changelog items, grouped by category (e.g., "Added", "Fixed").
 */
export type ChangelogItem = Record<string, ChangelogSubItem[]>;

/**
 * Represents a single version entry in the plugin's changelog.
 */
export type PluginChangelog = {
  /** The version number. */
  version: string;
  /** The release date of this version. */
  date: string;
  /** The list of changes in this version. */
  items: ChangelogItem[];
};

/**
 * A list of changelog entries for a plugin.
 */
export type PluginChanges = PluginChangelog[];

/**
 * Detailed information about a specific version of a plugin.
 */
export type VersionItem = {
  /** The version string (semver). */
  version: string;
  /** The commit hash associated with this version. */
  commit?: string;
  /** The release stage (e.g., stable, beta). */
  stage: SubscribeStages;
  /** The engines required by this version. */
  engines: PluginEngines;
  /** The platforms supported by this version. */
  platforms: OsPlatforms[];
};

/**
 * A list of version items.
 */
export type PluginVersions = VersionItem[];

/**
 * Complete versioning information for a plugin, including all versions and the changelog.
 */
export type PluginVersioning = {
  /** List of available versions. */
  versions: PluginVersions;
  /** Full changelog history. */
  changes: PluginChanges;
};

/**
 * Metadata describing a plugin.
 */
export type PluginMetadata = {
  /** Unique identifier for the plugin. */
  id: string;
  /** Display title of the plugin. */
  title: string;
  /** Description of the plugin's functionality. */
  description: string;
  /** The type of plugin (module or extension). */
  type: 'module' | 'extension';
};

/**
 * Compatibility status of a plugin version with the current application.
 */
type PluginCompatibility = {
  /** Whether the plugin is compatible. */
  isCompatible: boolean;
  /** Reason for incompatibility, if applicable. */
  incompatibleReason?: string;
};

/**
 * A version item that has been validated for compatibility, excluding engine details.
 */
export type VersionItemValidated = Omit<VersionItem, 'engines'> & PluginCompatibility;

/**
 * Complete information about a plugin item, including metadata, versions, and changes.
 */
export type PluginItem = {
  /** The URL where the plugin is hosted or installed from. */
  url: string;
  /** Metadata describing the plugin. */
  metadata: PluginMetadata;
  /** List of validated versions. */
  versions: VersionItemValidated[];
  /** Changelog history. */
  changes: PluginChanges;
  /** Total download counts (loaded dynamically from web API) */
  downloadsCount?: number;
} & PluginCompatibility;

/**
 * Represents a synchronization action for a plugin (upgrade or downgrade).
 */
export type PluginSyncItem = {
  /** The ID of the plugin. */
  id: string;
  /** The type of synchronization action. */
  type: 'downgrade' | 'upgrade';
  /** The target version. */
  version: string;
  /** The target commit hash. */
  commit?: string;
};

/**
 * Information about an installed plugin.
 */
export type PluginInstalledItem = {
  /** The ID of the plugin. */
  id: string;
  /** The URL from which it was installed. */
  url: string;
  /** The currently installed version. */
  version: string;
};

/**
 * Information about a plugin that failed to load.
 */
export type UnloadedPlugins = {
  /** The ID of the plugin. */
  id: string;
  /** The error message explaining why it failed to load. */
  message: string;
};

/**
 * Filter criteria for listing plugins.
 * Can be a set of specific types/statuses or 'all'.
 */
export type PluginFilter = Set<'installed' | 'modules' | 'extensions'> | 'all';

/**
 * A list of plugins that have been validated, including their type and folder path.
 */
export type ValidatedPlugins = {
  /** The type of plugin. */
  type: 'module' | 'extension';
  /** The folder path where the plugin is located. */
  folder: string;
}[];

/**
 * A list of plugin addresses (URLs or paths).
 */
export type PluginAddresses = {
  /** The type of plugin. */
  type: 'module' | 'extension';
  /** The address (URL or path). */
  address: string;
}[];
