import type {CustomArgKinds} from '@lynx_common/types';
import type {ArgumentsData, ArgumentType, ArgumentValue, ChosenArgument} from '@lynx_common/types/plugins/modules';

import {getArgumentByName} from './moduleArguments';

export type ParsedArgumentItem = {
  name: string;
  value: ArgumentValue;
  isModuleArg: boolean;
  moduleArgType?: ArgumentType;
  customKind?: CustomArgKinds;
  customType?: ArgumentType;
};

/**
 * Finds a matching ArgumentItem in ArgumentsData, trying exact match,
 * stripped dashes, added dashes, and case-insensitive matching.
 */
export function findMatchingModuleArg(cardArguments?: ArgumentsData, candidateName?: string) {
  if (!cardArguments || !candidateName) return undefined;

  // 1. Exact match
  const exact = getArgumentByName(cardArguments, candidateName);
  if (exact) return exact;

  // 2. If candidateName has leading dashes, try without dashes
  if (candidateName.startsWith('-')) {
    const withoutDashes = candidateName.replace(/^--?/, '');
    const found = getArgumentByName(cardArguments, withoutDashes);
    if (found) return found;
  } else {
    // 3. Try with -- and -
    const withDoubleDash = getArgumentByName(cardArguments, `--${candidateName}`);
    if (withDoubleDash) return withDoubleDash;

    const withSingleDash = getArgumentByName(cardArguments, `-${candidateName}`);
    if (withSingleDash) return withSingleDash;
  }

  // 4. Case-insensitive search across all items
  const candidateLower = candidateName.toLowerCase();
  const candidateLowerNoDash = candidateLower.replace(/^--?/, '');

  for (const group of cardArguments) {
    const items = 'sections' in group ? group.sections.flatMap(s => s.items) : group.items;
    for (const item of items) {
      const itemLower = item.name.toLowerCase();
      const itemLowerNoDash = itemLower.replace(/^--?/, '');
      if (itemLower === candidateLower || itemLowerNoDash === candidateLowerNoDash) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Casts a value to match the expected module argument type.
 */
export function castModuleArgValue(value: any, type?: ArgumentType): ArgumentValue {
  if (type === 'CheckBox') {
    if (typeof value === 'boolean') return value;
    const str = String(value).trim().toLowerCase();
    if (str === 'false' || str === '0' || str === 'off' || str === 'no' || str === 'disabled') {
      return false;
    }
    return true;
  }

  if (type === 'Number') {
    if (typeof value === 'number') return value;
    const num = Number(value);
    return isNaN(num) ? String(value) : num;
  }

  if (value === undefined || value === null) return '';
  return typeof value === 'boolean' ? value : String(value);
}

/**
 * Determines kind, type, and sanitized value for a custom argument.
 */
export function determineCustomArgKindAndType(
  name: string,
  rawValue: any,
  fromEnvContext: boolean = false,
): {kind: CustomArgKinds; type: ArgumentType; value: ArgumentValue} {
  let kind: CustomArgKinds = fromEnvContext ? 'envVar' : 'commandLine';

  if (!fromEnvContext) {
    if (name.startsWith('--') || name.startsWith('-')) {
      kind = 'commandLine';
    } else if (/^[A-Z0-9_]+$/.test(name)) {
      kind = 'envVar';
    } else {
      kind = 'custom';
    }
  }

  let type: ArgumentType = 'Input';
  let value: ArgumentValue = rawValue;

  if (typeof rawValue === 'boolean') {
    type = 'CheckBox';
    value = rawValue;
  } else if (rawValue === '' || rawValue === undefined) {
    if (kind === 'commandLine') {
      type = 'CheckBox';
      value = true;
    } else {
      type = 'Input';
      value = '';
    }
  } else if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === 'false') {
      type = 'CheckBox';
      value = trimmed === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(rawValue.trim())) {
      type = 'Number';
      value = Number(rawValue.trim());
    } else {
      type = 'Input';
      value = rawValue;
    }
  } else if (typeof rawValue === 'number') {
    type = 'Number';
    value = rawValue;
  }

  return {kind, type, value};
}

/**
 * Tokenizes a command line string respecting single/double quotes and backslash escaping.
 */
export function tokenizeCommandLine(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function processParsedPair(
  key: string,
  rawVal: any,
  cardArguments: ArgumentsData | undefined,
  addResult: (item: ParsedArgumentItem) => void,
  fromEnv: boolean,
) {
  if (!key) return;

  const modArg = findMatchingModuleArg(cardArguments, key);
  if (modArg) {
    addResult({
      name: modArg.name,
      value: castModuleArgValue(rawVal, modArg.type),
      isModuleArg: true,
      moduleArgType: modArg.type,
    });
  } else {
    const {kind, type, value} = determineCustomArgKindAndType(key, rawVal, fromEnv);
    addResult({
      name: key,
      value,
      isModuleArg: false,
      customKind: kind,
      customType: type,
    });
  }
}

function parseCliTokens(
  text: string,
  cardArguments: ArgumentsData | undefined,
  addResult: (item: ParsedArgumentItem) => void,
) {
  const tokens = tokenizeCommandLine(text);
  if (tokens.length === 0) return;

  const ignoreExecutables = new Set([
    'python',
    'python.exe',
    'python3',
    'python3.exe',
    'py',
    'py.exe',
    'node',
    'node.exe',
    'bash',
    'sh',
    'call',
    'start',
  ]);

  let i = 0;
  // If first token is an executable name, skip it
  if (
    tokens.length > 1 &&
    (ignoreExecutables.has(tokens[0].toLowerCase()) || /\.(py|sh|bat|cmd|js|mjs|ts)$/i.test(tokens[0]))
  ) {
    i = 1;
    if (
      tokens.length > 2 &&
      ignoreExecutables.has(tokens[0].toLowerCase()) &&
      /\.(py|sh|bat|cmd|js|mjs|ts)$/i.test(tokens[1])
    ) {
      i = 2;
    }
  }

  while (i < tokens.length) {
    const token = tokens[i];

    // Check if token has = inside it, e.g. --port=7860
    const eqIdx = token.indexOf('=');
    if (eqIdx > 0 && token.startsWith('-')) {
      const flagKey = token.slice(0, eqIdx);
      let flagVal = token.slice(eqIdx + 1);
      if ((flagVal.startsWith('"') && flagVal.endsWith('"')) || (flagVal.startsWith("'") && flagVal.endsWith("'"))) {
        flagVal = flagVal.slice(1, -1);
      }
      processParsedPair(flagKey, flagVal, cardArguments, addResult, false);
      i++;
      continue;
    }

    if (eqIdx > 0 && !token.startsWith('-')) {
      const envKey = token.slice(0, eqIdx);
      let envVal = token.slice(eqIdx + 1);
      if ((envVal.startsWith('"') && envVal.endsWith('"')) || (envVal.startsWith("'") && envVal.endsWith("'"))) {
        envVal = envVal.slice(1, -1);
      }
      processParsedPair(envKey, envVal, cardArguments, addResult, true);
      i++;
      continue;
    }

    if (token.startsWith('-')) {
      const flagName = token;
      const modArg = findMatchingModuleArg(cardArguments, flagName);

      if (modArg) {
        if (modArg.type === 'CheckBox') {
          if (i + 1 < tokens.length && /^(true|false|1|0|yes|no|on|off)$/i.test(tokens[i + 1])) {
            const boolVal = !/^(false|0|no|off)$/i.test(tokens[i + 1]);
            addResult({
              name: modArg.name,
              value: boolVal,
              isModuleArg: true,
              moduleArgType: modArg.type,
            });
            i += 2;
          } else {
            addResult({
              name: modArg.name,
              value: true,
              isModuleArg: true,
              moduleArgType: modArg.type,
            });
            i++;
          }
        } else {
          if (i + 1 < tokens.length && (!tokens[i + 1].startsWith('-') || /^-?\d+(\.\d+)?$/.test(tokens[i + 1]))) {
            addResult({
              name: modArg.name,
              value: castModuleArgValue(tokens[i + 1], modArg.type),
              isModuleArg: true,
              moduleArgType: modArg.type,
            });
            i += 2;
          } else {
            addResult({
              name: modArg.name,
              value: castModuleArgValue('', modArg.type),
              isModuleArg: true,
              moduleArgType: modArg.type,
            });
            i++;
          }
        }
      } else {
        // Not a module argument -> Custom argument
        if (i + 1 < tokens.length && (!tokens[i + 1].startsWith('-') || /^-?\d+(\.\d+)?$/.test(tokens[i + 1]))) {
          const nextVal = tokens[i + 1];
          const {kind, type, value} = determineCustomArgKindAndType(flagName, nextVal, false);
          addResult({
            name: flagName,
            value,
            isModuleArg: false,
            customKind: kind,
            customType: type,
          });
          i += 2;
        } else {
          addResult({
            name: flagName,
            value: true,
            isModuleArg: false,
            customKind: 'commandLine',
            customType: 'CheckBox',
          });
          i++;
        }
      }
    } else {
      i++;
    }
  }
}

/**
 * Universal parser function that takes raw text and parses it into argument items,
 * matching against module arguments or falling back to custom arguments.
 */
export function parseArgumentsText(
  rawText: string,
  cardArguments?: ArgumentsData,
  customMethodParse?: (args: string) => ChosenArgument[],
): ParsedArgumentItem[] {
  if (!rawText || !rawText.trim()) return [];

  const results: ParsedArgumentItem[] = [];
  const addedMap = new Map<string, number>();

  const addResult = (item: ParsedArgumentItem) => {
    if (addedMap.has(item.name)) {
      const idx = addedMap.get(item.name)!;
      results[idx] = item;
    } else {
      addedMap.set(item.name, results.length);
      results.push(item);
    }
  };

  // If card module has custom parseStringToArgs method, try it first
  if (customMethodParse) {
    try {
      const customResults = customMethodParse(rawText);
      if (Array.isArray(customResults) && customResults.length > 0) {
        for (const arg of customResults) {
          const modArg = findMatchingModuleArg(cardArguments, arg.name);
          if (modArg) {
            addResult({
              name: modArg.name,
              value: castModuleArgValue(arg.value, modArg.type),
              isModuleArg: true,
              moduleArgType: modArg.type,
            });
          } else {
            const {kind, type, value} = determineCustomArgKindAndType(
              arg.name,
              arg.value,
              arg.custom?.kind === 'envVar',
            );
            addResult({
              name: arg.name,
              value,
              isModuleArg: false,
              customKind: arg.custom?.kind || kind,
              customType: arg.custom?.type || type,
            });
          }
        }
        return results;
      }
    } catch (e) {
      console.warn('Error running card parseStringToArgs:', e);
    }
  }

  const trimmedText = rawText.trim();

  // 1. Try JSON parsing
  if (
    (trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
    (trimmedText.startsWith('[') && trimmedText.endsWith(']'))
  ) {
    try {
      const parsedJson = JSON.parse(trimmedText);
      if (Array.isArray(parsedJson)) {
        for (const item of parsedJson) {
          if (item && typeof item === 'object' && 'name' in item) {
            processParsedPair(item.name, item.value, cardArguments, addResult, item.custom?.kind === 'envVar');
          }
        }
        if (results.length > 0) return results;
      } else if (parsedJson && typeof parsedJson === 'object') {
        for (const [key, val] of Object.entries(parsedJson)) {
          processParsedPair(key, val, cardArguments, addResult, false);
        }
        if (results.length > 0) return results;
      }
    } catch {
      // Not valid JSON, continue with line-by-line parsing
    }
  }

  // 2. Line-by-line processing
  const lines = rawText.split(/\r?\n/);
  const wrapperVarNames = new Set([
    'COMMANDLINE_ARGS',
    'COMMAND_LINE_ARGS',
    'CLI_ARGS',
    'ARGS',
    'EXTRA_ARGS',
    'CMD_ARGS',
    'FLAGS',
    'OPTIONS',
    'WEBUI_ARGS',
  ]);

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#') || line.startsWith('//') || /^rem\b/i.test(line) || line.startsWith('::')) {
      continue;
    }

    line = line
      .replace(/^@?echo\s+off\b/i, '')
      .replace(/^export\s+/i, '')
      .replace(/^set\s+/i, '')
      .replace(/^\$env:/i, '')
      .trim();

    if (!line) continue;

    const eqIndex = line.indexOf('=');
    const colonIndex = line.indexOf(':');

    if (eqIndex > 0 && (!line.startsWith('-') || wrapperVarNames.has(line.slice(0, eqIndex).trim().toUpperCase()))) {
      const key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      if (wrapperVarNames.has(key.toUpperCase())) {
        parseCliTokens(val, cardArguments, addResult);
      } else {
        processParsedPair(key, val, cardArguments, addResult, true);
      }
      continue;
    }

    if (colonIndex > 0 && !line.startsWith('-') && !line.includes('://') && !/^[a-zA-Z]:[\\/]/.test(line)) {
      const key = line.slice(0, colonIndex).trim();
      let val = line.slice(colonIndex + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      processParsedPair(key, val, cardArguments, addResult, true);
      continue;
    }

    parseCliTokens(line, cardArguments, addResult);
  }

  return results;
}
