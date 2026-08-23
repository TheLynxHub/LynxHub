/**
 * Command-line options supported by the application.
 */
export interface AppCliOptions {
  /**
   * If true, starts the application without loading any installed plugins.
   * Specified via `--unload-plugins`.
   */
  unloadPlugins: boolean;

  /**
   * Unparsed raw command-line arguments.
   */
  rawArgs: string[];
}
