import type {ElectronAPI} from '@electron-toolkit/preload';
import type * as pty from 'node-pty';

import type {AvailablePageIDs} from '../../consts';
import type {ToastFunction} from '../../utils/toast';
import {CustomArg} from '../index';
import type {CustomRunBehaviorData} from '../ipc';

declare global {
  interface Window {
    electron: ElectronAPI;
    osPlatform: NodeJS.Platform;
    isPortable: 'win' | 'linux' | null;
  }
}

/**
 * Basic metadata for an extension.
 */
export type ExtensionData = {
  /** The display title of the extension. */
  title: string;
  /** A brief description of the extension. */
  description: string;
  /** The URL of the extension's repository or homepage. */
  url: string;
  /** The number of stars (e.g., on GitHub), if available. */
  stars?: number;
};

/**
 * Interface for a simple key-value storage mechanism.
 */
export type StorageType = {
  /**
   * Retrieve a value from storage.
   * @param key - The key to retrieve.
   * @returns The stored value.
   */

  get: <T = any>(key: string) => T;
  /**
   * Save a value to storage.
   * @param key - The key to store.
   * @param data - The data to save.
   */

  set: <T = any>(key: string, data: T) => void;
};

/**
 * Interface for IPC communication in the main process.
 */
export type MainIpcTypes = {
  /**
   * Handle an IPC invocation from the renderer.
   * @param channel - The channel to listen on.
   * @param listener - The callback function.
   */

  handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
  /**
   * Listen for an IPC message.
   * @param channel - The channel to listen on.
   * @param listener - The callback function.
   */

  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  /**
   * Send an IPC message.
   * @param channel - The channel to send on.
   * @param args - Arguments to send.
   */

  send: (channel: string, ...args: any[]) => void;
};

/**
 * Interface for IPC communication in the renderer process.
 */
export type RendererIpcTypes = {
  /**
   * Invoke an IPC handler in the main process.
   * @param channel - The channel to invoke.
   * @param args - Arguments to pass.
   * @returns A promise resolving to the result.
   */

  invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
  /**
   * Listen for an IPC message.
   * @param channel - The channel to listen on.
   * @param listener - The callback function.
   * @returns A function to remove the listener.
   */

  on(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
  /**
   * Send an IPC message.
   * @param channel - The channel to send on.
   * @param args - Arguments to send.
   */

  send(channel: string, ...args: any[]): void;
};

/**
 * Methods available to a card module in the main process (Initial version).
 */
export type CardMainMethodsInitial = (utils: MainModuleUtils) => {
  /** Return commands based on installed directory to be executed with terminal */
  getRunCommands: () => Promise<string | string[]>;

  /** Read saved argument from file and return data with the array of type ChosenArgument */
  readArgs?: () => Promise<ChosenArgument[]>;

  /** Get user configured arguments and save it to desire file */
  saveArgs?: (args: ChosenArgument[]) => Promise<void>;
  mainIpc?: () => void;
  updateAvailable?: () => Promise<boolean>;
  isInstalled?: () => Promise<boolean>;
  uninstall?: () => Promise<void>;
};

/**
 * Methods available to a card module in the main process.
 */
export type CardMainMethods = () => {
  /** Return commands based on installed directory to be executed with terminal */
  getRunCommands: () => Promise<string | string[]>;

  /** Read saved argument from file and return data with the array of type ChosenArgument */
  readArgs?: () => Promise<ChosenArgument[]>;

  /** Get user configured arguments and save it to desire file */
  saveArgs?: (args: ChosenArgument[]) => Promise<void>;
  mainIpc?: () => void;
  updateAvailable?: () => Promise<boolean>;
  isInstalled?: () => Promise<boolean>;
  uninstall?: () => Promise<void>;
};

/**
 * Represents the method chosen for installation.
 */
export type InstallationMethod = {
  chosen: 'install' | 'locate';
  targetDirectory?: string;
};

/**
 * Supported types for user input fields.
 */
export type UserInputFieldType = 'checkbox' | 'text-input' | 'select' | 'directory' | 'file';

/**
 * Configuration for a single user input field.
 */
export type UserInputField = {
  id: string;
  label: string;
  type: UserInputFieldType;
  selectOptions?: string[];
  defaultValue?: string | boolean;
  isRequired?: boolean;
};

/**
 * Result of a user input interaction.
 */
export type UserInputResult = {
  id: string;
  result: string | boolean;
};

/**
 * Options for the starter step of installation.
 */
export type StarterStepOptions = {
  disableSelectDir?: boolean;
};

export type AlertTypes = 'default' | 'note' | 'warning' | 'danger';
export type CustomAlertParams = {
  /** The type effect state of alert, color and icon */
  type?: AlertTypes;
  title: string;
  description?: string;
  /** The url's appear as link or button for user to navigate */
  urls?: {title: string; url: string}[];
};

export type InitialStep =
  | string
  | {
      title: string;
      alerts: CustomAlertParams[];
    };
export type InitialSteps = InitialStep[];

/**
 * Interface for the installation stepper, guiding the user through the installation process.
 */
export type InstallationStepper = {
  /**
   * Initialize the installation process by setting up the required steps.
   * @param stepTitles An array of step titles representing the installation workflow.
   */
  initialSteps: (stepTitles: InitialSteps) => void;

  /** Advance to the next step in the installation process. */
  nextStep: () => Promise<void>;

  /**
   * Normally the first step (Contain locating or start installation)
   * @return A promise resolving to the user's choice of installation method.
   */
  starterStep: (options?: StarterStepOptions) => Promise<InstallationMethod>;

  /**
   * Clone a Git repository to a user-selected directory.
   * @param url The URL of the Git repository to clone.
   * @returns A promise resolving to the path of the cloned repository.
   */
  cloneRepository: (url: string) => Promise<string>;

  /**
   * Execute a terminal script file.
   * @param workingDirectory The directory in which to execute the script.
   * @param scriptFileName The name of the script file to execute.
   * @returns A promise that resolves when execution is complete and the user proceeds.
   */
  runTerminalScript: (workingDirectory: string, scriptFileName: string) => Promise<void>;

  /**
   * Execute one or more terminal commands.
   * @param commands A single command or an array of commands to execute.
   * @param workingDirectory Optional directory in which to execute the commands.
   * @returns A promise that resolves when execution is complete and the user proceeds.
   */
  executeTerminalCommands: (commands: string | string[], workingDirectory?: string) => Promise<void>;

  /**
   * Download a file from a given URL.
   * @param fileUrl The URL of the file to download.
   * @returns A promise resolving to the path of the downloaded file.
   */
  downloadFileFromUrl: (fileUrl: string) => Promise<string>;

  /**
   * Displays a progress bar UI element.
   * @param isIndeterminate Whether the progress is indeterminate (true) or determinate (false).
   * @param title The title of the progress bar.
   * @param percentage The completion percentage (0-100) for determinate progress. Ignored if isIndeterminate is true.
   * @param description Optional array of label-value pairs to provide additional information about the progress.
   */
  progressBar: (
    isIndeterminate: boolean,
    title?: string,
    percentage?: number,
    description?: {
      label: string;
      value: string;
    }[],
  ) => void;

  /**
   * Call this when installation is done to set the card installed
   * @param dir The directory to save
   */
  setInstalled: (dir?: string) => void;

  /**
   * Mark the installation as updated.
   */
  setUpdated: () => void;

  /**
   * Collect user input for various configuration options.
   * @param inputFields An array of input fields to present to the user.
   * @param title Optional title for the input dialog.
   * @returns A promise resolving to an array of user input results.
   */
  collectUserInput: (inputFields: UserInputField[], title?: string) => Promise<UserInputResult[]>;

  /**
   * Display the final step of the installation process with a result message.
   * @param resultType The type of result: 'success' or 'error'.
   * @param resultTitle A title summarizing the result.
   * @param resultDescription An optional detailed description of the result.
   */
  showFinalStep: (resultType: 'success' | 'error', resultTitle: string, resultDescription?: string) => void;

  /**
   * Provides access to the renderer process IPC methods.
   * Use this to send/receive data or messages between the renderer process and the main process.
   */
  ipc: RendererIpcTypes;

  /**
   * Storage access for the installation process.
   */

  storage: {get: <T = any>(key: string) => Promise<T>; set: <T = any>(key: string, data: T) => void};

  /** Use these operations after the `setInstalled` function */
  postInstall: {
    /**
     * Installs a list of extensions for the user
     * @param extensionURLs An array of Git repository URLs to clone
     * @param extensionsDir The target directory where the extensions will be cloned
     * @returns A Promise that resolves when all extensions are installed
     */
    installExtensions: (extensionURLs: string[], extensionsDir: string) => Promise<void>;

    /**
     * Configures the WebUI with the provided settings
     * @param configs An object containing configuration options
     */
    config: (configs: {
      /** If true, automatically updates all extensions when launching WebUI */
      autoUpdateExtensions?: boolean;

      /** If true, automatically updates the WebUI itself */
      autoUpdateCard?: boolean;

      /** Pre-defined arguments to pass to the WebUI */
      customArguments?: {
        /** Name of the preset configuration */
        presetName: string;
        /** Array of custom arguments */
        customArguments: {
          /** Name of the argument like --use-cpu */
          name: string;
          /** Value of the argument
           * - Set empty string '', if it's Boolean or CheckBox
           */
          value: string;
        }[];
      };

      /** Custom commands to execute instead of the actual command to launch WebUI */
      customCommands?: string[];

      /** Defines the behavior of the browser and terminal when launching */
      launchBehavior?: Omit<CustomRunBehaviorData, 'cardID'>;

      /** Actions to perform before launching WebUI */
      preLaunch?: {
        /** Commands to execute before launch */
        preCommands: string[];
        /** Paths to open before launch */
        openPath: {path: string; type: 'folder' | 'file'}[];
      };
    }) => void;
  };

  /** Utility functions that don't involve UI interaction */
  utils: {
    /**
     * Decompress a file.
     * @param compressedFilePath The path to the compressed file.
     * @returns A promise resolving to the path of the decompressed data.
     */
    decompressFile: (compressedFilePath: string) => Promise<string>;

    /**
     * Validate if a local directory matches a given Git repository URL.
     * @param localDirectory The local directory to validate.
     * @param repositoryUrl The Git repository URL to compare against.
     * @returns A promise resolving to true if the directory matches the repository, false otherwise.
     */
    validateGitRepository: (localDirectory: string, repositoryUrl: string) => Promise<boolean>;

    /**
     * Check for the existence of specified files or folders in a directory.
     * @param directory The directory to search in.
     * @param itemNames An array of file or folder names to check for.
     * @returns A promise resolving to true if all items exist, false otherwise.
     */
    verifyFilesExist: (directory: string, itemNames: string[]) => Promise<boolean>;

    /**
     * Open a file or folder using the system's default manner.
     * @param itemPath Absolute path to open
     */
    openFileOrFolder: (itemPath: string) => void;
  };

  topToast: ToastFunction;
  bottomToast: ToastFunction;
};

/**
 * API available to the card info callback.
 */
export type CardInfoApi = {
  /** The folder where the card is installed. */
  installationFolder?: string;

  /** Storage access. */

  storage: {get: <T = any>(key: string) => Promise<T>; set: <T = any>(key: string, data: T) => void};
  /** IPC access. */
  ipc: RendererIpcTypes;

  /** Get the size of a folder. */
  getFolderSize: (dir: string) => Promise<number>;
  /** Get the creation time of a folder. */
  getFolderCreationTime: (dir: string) => Promise<string>;
  /** Get the last pulled date of a git repository. */
  getLastPulledDate: (dir: string) => Promise<string>;
  /** Get the current release tag of a git repository. */
  getCurrentReleaseTag: (dir: string) => Promise<string>;
};

/**
 * Items for card info description.
 */
export type CardInfoDescriptions_Items = {label: string; result: string | 'loading' | undefined | null}[];

/**
 * Structure for card info descriptions.
 */
export type CardInfoDescriptions = {title: string; items: CardInfoDescriptions_Items}[] | undefined;

/**
 * Callback interface for card info updates.
 */
export type CardInfoCallback = {
  setDescription: (descriptions: CardInfoDescriptions) => void;
  setOpenFolders: (dir: string[] | undefined) => void;
};

/**
 * Methods provided by the card renderer.
 */
export type CardRendererMethods = {
  /**
   * This method will be called with terminal output line parameter
   * @param line - The terminal output line.
   * @return URL of running AI to be showing in browser of the user and
   * @return undefined if URL is not in that line
   */
  catchAddress?: (line: string) => string | undefined;

  /** Fetching and return array of available extensions in type of `ExtensionData` */
  fetchExtensionList?: () => Promise<ExtensionData[]>;

  /** Parse the given argument to string */
  parseArgsToString?: (args: ChosenArgument[]) => string;

  /** Parse given string to the arguments */
  parseStringToArgs?: (args: string) => ChosenArgument[];

  /** Display card information. */
  cardInfo?: (api: CardInfoApi, callback: CardInfoCallback) => void;

  /** Installation manager methods. */
  manager?: {
    startInstall: (stepper: InstallationStepper) => void;
    updater: {
      updateType: 'git' | 'stepper';
      startUpdate?: (stepper: InstallationStepper, dir?: string) => void;
    };
  };
};

/**
 * Data structure representing a Card (Module).
 */
export type CardData = {
  /**  ID will be used to managing state of card */
  id: string;

  /**  Url to repository (Using this url recognize, clone and update card) */
  repoUrl?: string;

  /**  The title of card */
  title: string;

  /**  Description about what card does */
  description: string;

  /**  The directory of extension (In relative path like '/extensions')
   *   - Leave undefined if WebUI have no extension ability
   */
  extensionsDir?: string;

  /** Type of installation. */
  installationType?: 'git' | 'others';

  /** Type of uninstallation. */
  uninstallType?: 'removeFolder' | 'others';

  /** Type of AI (Using type for things like discord activity status) */
  type?: 'image' | 'audio' | 'text' | 'unknown';

  /** List of all available arguments
   *  - Leave undefined if WebUI have no arguments to config
   */
  arguments?: ArgumentsData;

  /** Whether this module handles the custom arguments defined by user
   * Leave undefined for disabling custom tab in argument modal
   */
  supportCustomArguments?: boolean;

  /** These methods will be called in the renderer process
   * @description This methods will be used when user interaction (Like recognizing URL to show in browser)
   */
  methods?: CardRendererMethods;

  /** An optional URL or local path for the card's avatar or icon */
  logoUrl?: string;
  iconUrl?: string;

  /** An optional developer/creator name to display on the card */
  developer?: string;
};

/**
 * Card data loaded into the application, including route path.
 */
export type LoadedCardData = Omit<CardData, 'arguments' | 'methods'> & {routePath: AvailablePageIDs};

/**
 * Arguments loaded for a card.
 */
export type LoadedArguments = Pick<CardData, 'arguments' | 'supportCustomArguments' | 'id'>;

/**
 * Methods loaded for a card.
 */
export type LoadedMethods = Pick<CardData, 'methods' | 'id'>;

/**
 * Data for a page containing cards.
 */
export type PagesData = {
  /** Router path (For placing the card in relative page) */
  routePath: AvailablePageIDs;

  /** Cards data */
  cards: CardData[];
};

/**
 * Collection of card modules.
 */
export type CardModules = PagesData[];

/**
 * A chosen argument value.
 */
export type ChosenArgument = {name: string; value: string | number; custom?: Pick<CustomArg, 'type' | 'kind'>};

/**
 * Supported argument types.
 */
export type ArgumentType = 'Directory' | 'File' | 'Input' | 'Number' | 'DropDown' | 'CheckBox';
export type ArgumentDropdownValues = {value: string; description?: string}[];

/**
 * Definition of a single argument item.
 */
export type ArgumentItem = {
  name: string;
  description?: string;
  type: ArgumentType;

  numberStep?: number;
  numberMax?: number;
  numberMin?: number;

  defaultValue?: any;
  values?: string[] | ArgumentDropdownValues;
};

/**
 * A section of arguments.
 */
export type ArgumentSection = {
  section: string;
  items: ArgumentItem[];
};

/**
 * A data section containing arguments.
 */
export type DataSection = {
  category: string;
  condition?: string;
  sections: ArgumentSection[];
};

/**
 * A data item containing arguments.
 */
export type DataItem = {
  category: string;
  condition?: string;
  items: ArgumentItem[];
};

/**
 * Structure for arguments data.
 */
export type ArgumentsData = (DataItem | DataSection)[];

/**
 * Simple argument type.
 */
export type ArgType = {name: string; value: string};

/**
 * Category of argument.
 */
export type Category = 'env' | 'envVar' | 'cl' | undefined;

/**
 * Structure for main process modules.
 */
export type MainModules = {
  /** The ID of the card that using these methods */
  id: string;

  /** These methods will be called in the main process
   * @description This methods will be used when user interaction (Like run, config, etc.)
   */
  methods: CardMainMethods;
};

/**
 * Asset in a GitHub release.
 */
export type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

/**
 * GitHub release information.
 */
export type GitHubRelease = {
  tag_name: string;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
};

/**
 * Type for importing a main module.
 */
export type MainModuleImportType = {
  default: (utils: MainModuleUtils) => Promise<MainModules[]>;
};

/**
 * Type for importing a renderer module.
 */
export type RendererModuleImportType = {
  default: CardModules;
  setCurrentBuild?: (build: number) => void;
};

/**
 * Utilities available to main modules.
 */
export type MainModuleUtils = {
  storage: StorageType;
  ipc: MainIpcTypes;
  pty: typeof pty;
  isPullAvailable: (dir: string) => Promise<boolean>;
  trashDir: (dir: string) => Promise<void>;
  removeDir: (dir: string) => Promise<void>;
  getInstallDir: (id: string) => string | undefined;
  getConfigDir: () => string | undefined;
  pullDir: (dir: string, showTaskbarProgress?: boolean) => Promise<void>;
  /** It's best to call and get commands when need to execute (to get latest changed commands) */
  getExtensions_TerminalPreCommands: (id: string) => string[];
};
