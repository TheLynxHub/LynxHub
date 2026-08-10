import {capitalize} from 'lodash-es';

import packageJson from '../../../package.json';

/** Application name from package.json */
export const APP_NAME: string = packageJson.appDetails.title;
/** Application version from package.json */
export const APP_VERSION: string = packageJson.version;
/** Application build number from package.json */
export const APP_BUILD_NUMBER: number = packageJson.appDetails.buildNumber;

/** Application description from package.json */
export const APP_DESCRIPTION: string = packageJson.description;
/** Application author name from package.json */
export const APP_AUTHOR_NAME: string = packageJson.author.name;
/** Application detailed description from package.json */
export const APP_DETAILED_DESCRIPTION: string = packageJson.appDetails.detailedDescription;

/** Homepage URL */
export const LYNXHUB_HOMEPAGE = packageJson.homepage;
/** Website URL */
export const LYNXHUB_WEBSITE = import.meta.env.DEV ? 'http://localhost:3000' : 'https://lynxhub.app';
export const LYNXHUB_DOCS = 'https://docs.lynxhub.app';
/** Releases page URL */
export const RELEASES_PAGE = `${LYNXHUB_HOMEPAGE}/releases`;
/** Early access releases page URL */
export const EARLY_RELEASES_PAGE = 'https://www.patreon.com/collection/714004';
/** Insider releases page URL */
export const INSIDER_RELEASES_PAGE = 'https://www.patreon.com/collection/1557749';

/** Author email */
export const EMAIL: string = packageJson.author.email;
/** Issues page URL */
export const ISSUE_PAGE: string = `${packageJson.repository.url}/issues`;
/** License page URL */
export const LICENSE_PAGE: string = `${packageJson.repository.url}/blob/master/LICENSE`;
/** License name */
export const LICENSE_NAME: string = packageJson.license;

/** Module API version */
export const MODULE_API_VERSION: string = packageJson.appDetails.moduleApiVersion;
/** Extension API version */
export const EXTENSION_API_VERSION: string = packageJson.appDetails.extensionApiVersion;

/** Application version with 'V' prefix */
export const APP_VERSION_V: string = `V${APP_VERSION}`;
/** Application name and version */
export const APP_NAME_VERSION: string = `${APP_NAME} ${APP_VERSION}`;
/** Application name and version with 'V' prefix */
export const APP_NAME_VERSION_V: string = `${APP_NAME} ${APP_VERSION_V}`;
/** Application version formatted with spaces */
export const APP_VERSION_FORMAT: string = APP_VERSION_V.split('-')
  .map(v => capitalize(v))
  .join(' ');

export const PLUGINS_FOLDER_NAME = 'Plugins' as const;
export const BINARIES_FOLDER_NAME = 'Binaries' as const;
export const REPOSITORIES_FOLDER_NAME = 'AIWorkspaces' as const;
export const STATICS_FOLDER_NAME = 'Statics' as const;

// Static Assets
export const APP_ICON_TRANSPARENT: string = 'LynxHub.png';

export const GITHUB_ORG: string = 'https://github.com/TheLynxHub';

export const MAIN_MODULE_URL: string = `${GITHUB_ORG}/Local-AI-Collection`;
export const STATICS_URL: string = `${GITHUB_ORG}/Statics`;
export const DISCORD_SERVER: string = 'https://discord.gg/e8rBzhtcnK';
export const X_URL: string = 'https://x.com/LynxHubAI';
export const PATREON_URL: string = 'https://www.patreon.com/LynxHub';
export const GITHUB_URL: string = `${GITHUB_ORG}/LynxHub`;
export const REDDIT_URL: string = 'https://www.reddit.com/r/LynxHubAI';
export const YOUTUBE_URL: string = 'https://www.youtube.com/@LynxHubAI';

/**
 * Page IDs used for navigation.
 */
export const PageID = {
  home: 'home_page',
  imageGen: 'imageGen_page',
  textGen: 'textGen_page',
  audioGen: 'audioGen_page',

  tools: 'tools_page',
  games: 'games_page',
  others: 'others_page',
  agents: 'agents_page',

  dashboard: 'dashboard_page',
  plugins: 'plugins_page',
  settings: 'settings_page',
  chatBridge: 'chatBridge_page',
} as const;

export type AvailablePageIDs = (typeof PageID)[keyof typeof PageID];

/**
 * Titles for each page ID.
 */
export const PageTitles = {
  home: 'Home',
  imageGen: 'Image Generation',
  textGen: 'Text Generation',
  audioGen: 'Audio Generation',

  tools: 'Tools',
  games: 'Games',
  others: 'Others',
  agents: 'Agents',

  dashboard: 'Dashboard',
  plugins: 'Plugins',
  settings: 'Settings',
  chatBridge: 'Chat Bridge',
} as const;

/**
 * Mapping of PageID to PageTitle.
 */
export const PageTitleByPageId = {
  [PageID.home]: 'Home',
  [PageID.imageGen]: 'Image Generation',
  [PageID.textGen]: 'Text Generation',
  [PageID.audioGen]: 'Audio Generation',

  [PageID.tools]: 'Tools',
  [PageID.games]: 'Games',
  [PageID.others]: 'Others',
  [PageID.agents]: 'Agents',

  [PageID.dashboard]: 'Dashboard',
  [PageID.plugins]: 'Plugins',
  [PageID.settings]: 'Settings',
  [PageID.chatBridge]: 'Chat Bridge',
} as const;
