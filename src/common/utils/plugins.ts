import {PluginVersions} from '../types/plugins';
import {extractGitUrl} from './urlUtils';

/**
 * Determines the update type (upgrade or downgrade) based on commit history.
 *
 * @param {PluginVersions} versions - List of plugin versions.
 * @param {string} currentCommit - The current commit hash.
 * @param {string} targetCommit - The target commit hash.
 * @returns {'upgrade' | 'downgrade' | undefined} The update type, or undefined if target commit not found.
 */
export function getUpdateType(
  versions: PluginVersions,
  currentVerOrCommit: string,
  targetVerOrCommit: string,
): 'downgrade' | 'upgrade' | undefined {
  const currentIndex = versions.findIndex(
    v => v.version === currentVerOrCommit || (v.commit && v.commit === currentVerOrCommit),
  );
  const targetIndex = versions.findIndex(
    v => v.version === targetVerOrCommit || (v.commit && v.commit === targetVerOrCommit),
  );

  if (targetIndex === -1) {
    return undefined;
  }

  let type: 'downgrade' | 'upgrade';

  if (currentIndex === -1) {
    type = 'upgrade';
  } else if (targetIndex < currentIndex) {
    type = 'upgrade';
  } else {
    type = 'downgrade';
  }

  return type;
}

/**
 * Generates the raw content URL for the README.md file of a plugin repository.
 *
 * @param {string | undefined} repoUrl - The repository URL.
 * @returns {string | undefined} The raw content URL for README.md, or undefined if invalid.
 */
export function getPluginReadmeUrl(repoUrl: string | undefined): string | undefined {
  if (!repoUrl) return undefined;

  try {
    const {owner, repo} = extractGitUrl(repoUrl);

    if (owner && repo) {
      return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/source/README.md`;
    }

    return undefined;
  } catch (error) {
    console.error('Failed to parse repository URL:', repoUrl, error);
    return undefined;
  }
}

/**
 * Generates the raw content URL for the icon.png file of a plugin repository.
 *
 * @param {string | undefined} repoUrl - The repository URL.
 * @returns {string | undefined} The raw content URL for icon.png, or undefined if invalid.
 */
export function getPluginIconUrl(repoUrl: string | undefined): string | undefined {
  if (!repoUrl) return undefined;

  try {
    const {owner, repo} = extractGitUrl(repoUrl);

    if (owner && repo) {
      return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/metadata/icon.png`;
    }

    return undefined;
  } catch (error) {
    console.error('Failed to parse repository URL:', repoUrl, error);
    return undefined;
  }
}
