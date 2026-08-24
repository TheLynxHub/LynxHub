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
   * If true, periodically logs Electron process memory/CPU metrics to console.
   * Specified via `--log-metrics`.
   */
  logMetrics: boolean;

  /**
   * Unparsed raw command-line arguments.
   */
  rawArgs: string[];
}
