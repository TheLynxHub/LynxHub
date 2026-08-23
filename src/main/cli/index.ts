import {AppCliOptions} from '@lynx_common/types';
import {app} from 'electron';

let cachedCliOptions: AppCliOptions | null = null;

/**
 * Checks if a specific boolean flag exists in the arguments list or Electron commandLine switches.
 * Supports exact match (--flag), assignment format (--flag=true/1/false/0), and Electron switches.
 *
 * @param flagName - Flag name without leading dashes (e.g. 'unload-plugins')
 * @param argv - Argument array to search
 * @returns boolean indicating whether the flag is active
 */
export function hasCliFlag(flagName: string, argv: string[] = process.argv): boolean {
  const fullFlag = `--${flagName}`;
  const prefix = `--${flagName}=`;

  const inArgv = argv.some(arg => {
    if (arg === fullFlag) return true;
    if (arg.startsWith(prefix)) {
      const val = arg.slice(prefix.length).trim().toLowerCase();
      return val === '' || val === 'true' || val === '1';
    }
    return false;
  });

  if (inArgv) return true;

  try {
    if (typeof app !== 'undefined' && app.commandLine?.hasSwitch) {
      if (app.commandLine.hasSwitch(flagName)) {
        const switchVal = app.commandLine.getSwitchValue(flagName).toLowerCase();
        return switchVal === '' || switchVal === 'true' || switchVal === '1';
      }
    }
  } catch {
    // app.commandLine may not be available in non-Electron or mock contexts
  }

  return false;
}

/**
 * Parses application command-line arguments into a structured AppCliOptions object.
 *
 * @param argv - Array of argument strings (defaults to process.argv)
 * @returns Parsed AppCliOptions
 */
export function parseCliArgs(argv: string[] = process.argv): AppCliOptions {
  const rawArgs = [...argv];
  const unloadPlugins = hasCliFlag('unload-plugins', rawArgs);

  cachedCliOptions = {
    unloadPlugins,
    rawArgs,
  };

  return cachedCliOptions;
}

/**
 * Gets the current parsed CLI options, parsing process.argv if not already cached.
 *
 * @returns Active AppCliOptions
 */
export function getCliArgs(): AppCliOptions {
  if (!cachedCliOptions) {
    return parseCliArgs();
  }
  return cachedCliOptions;
}
