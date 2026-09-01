import {isEqual} from 'lodash-es';
import normalizeUrl, {Options} from 'normalize-url';

import {SearchQuerySites} from '../types';

/**
 * Extracts the owner and repository name from a given GitHub | GitLab URL.
 * @param {string} url - The GitHub repository URL.
 * @returns {{owner: string, repo: string, platform: 'github' | 'gitlab', avatarUrl: string}} An object containing the owner and repository name.
 * @throws {Error} If the provided URL is not a valid GitHub repository URL.
 */
export function extractGitUrl(url: string): {
  owner: string;
  repo: string;
  platform: 'github' | 'gitlab';
  avatarUrl: string;
} {
  // Regular expression to match GitHub and GitLab repository URLs with or without protocol
  const gitRepoRegex = /^(https?:\/\/)?(www\.)?(github|gitlab)\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;
  const match = url.match(gitRepoRegex);

  if (!match) {
    throw new Error(`Invalid Git repository URL: ${url}`);
  }

  const [, , , platform, owner, repo] = match;
  const avatarUrl = `https://github.com/${owner}.png`;
  return {owner, repo, platform: platform as 'github' | 'gitlab', avatarUrl};
}

/**
 * Validates and normalizes a GitHub | GitLab repository URL.
 * @param {string} url - The URL to validate
 * @returns {string} Normalized GitHub repository URL or an empty string if invalid
 */
export function validateGitRepoUrl(url: string): string {
  if (!url) return '';

  const githubMatch = url
    .toLowerCase()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(\.git)?(\/)?$/i);
  if (githubMatch) {
    return `https://github.com/${githubMatch[1]}/${githubMatch[2]}`;
  }

  const gitlabMatch = url
    .toLowerCase()
    .match(/^(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([^/]+)\/([^/]+?)(\.git)?(\/)?$/i);
  if (gitlabMatch) {
    return `https://gitlab.com/${gitlabMatch[1]}/${gitlabMatch[2]}`;
  }

  return '';
}

/**
 * Checks if a string or array of strings are valid URLs.
 * @param {string | string[]} str - The string or array of strings to check.
 * @returns {boolean} True if all inputs are valid URLs.
 */
export function isValidURL(str: string | string[]): boolean {
  const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z]{2,6})(?:[\\/\w .-]*)?$/i;

  const check = (url: string) => {
    if (url.toLowerCase().startsWith('file://')) {
      return true;
    }
    if (urlRegex.test(url)) {
      return true;
    }
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return Array.isArray(str) ? str.every(check) : check(str);
}

/**
 * Formats a local file path or file URL into a valid file:// URL.
 * Handles Windows paths (C:\...), Unix paths (/...), and corrupted prefixes (https://C:/...).
 * @param {string} input - The file path or URL to format.
 * @returns {string} The formatted file:// URL.
 */
export function formatLocalPathToUrl(input: string): string {
  if (!input) return '';

  let cleaned = input.trim();

  // Strip accidental file:///https:// or file://https:// or https:// or http:// if followed by drive letter or absolute path
  cleaned = cleaned.replace(/^file:\/\/(?:https?:\/\/)?/i, '');
  cleaned = cleaned.replace(/^https?:\/\//i, '');

  // Normalize backslashes to forward slashes
  cleaned = cleaned.replace(/\\/g, '/');

  // Strip leading file:/ if any remaining
  cleaned = cleaned.replace(/^file:\/+/i, '');

  // If Windows drive letter (e.g. C:/...)
  if (/^[a-zA-Z]:\//i.test(cleaned)) {
    return `file:///${cleaned}`;
  }

  // If Unix absolute path (starts with /)
  if (cleaned.startsWith('/')) {
    return `file://${cleaned}`;
  }

  return `file:///${cleaned}`;
}

/**
 * Determines if the given string is a search query rather than a URL.
 * @param {string} input - The input string to check
 * @returns {boolean} True if the input appears to be a search query, false if it's likely a URL
 */
export function isSearchQuery(input: string): boolean {
  if (!input) {
    return false;
  }

  const trimmedInput = input.trim();

  // If it starts with file:// protocol or Windows drive letter, it's definitely a URL/path
  if (trimmedInput.toLowerCase().startsWith('file://') || /^[a-zA-Z]:[\\/]/i.test(trimmedInput)) {
    return false;
  }

  // If it contains spaces, it's likely a search query
  if (trimmedInput.includes(' ')) {
    return true;
  }

  // If it starts with a protocol, it's definitely a URL
  if (/^(?:https?|file|ftp):\/\//i.test(trimmedInput)) {
    return false;
  }

  // If it looks like localhost or IP address, it's a URL
  if (/^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(trimmedInput)) {
    return false;
  }

  // If it contains a dot and looks like a domain, it's likely a URL
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/.*)?$/.test(trimmedInput)) {
    return false;
  }

  // If it starts with www., it's likely a URL
  if (/^www\./i.test(trimmedInput)) {
    return false;
  }

  // If it contains common search operators or patterns, it's a search query
  if (/[+\-"'(){}[\]]/.test(trimmedInput) || /\b(and|or|not)\b/i.test(trimmedInput)) {
    return true;
  }

  // If it's a single word without dots, it's likely a search query
  if (!/\./.test(trimmedInput)) {
    return true;
  }

  // Default to search query for ambiguous cases
  return true;
}

/**
 * Formats a web address, optionally detecting if it's a search query.
 * @param {string} address - The address to format.
 * @param {boolean} [detectSearchQuery] - Whether to detect if it's a search query.
 * @returns {string} The formatted address.
 */
export function formatWebAddress(address: string, detectSearchQuery?: boolean): string {
  if (!address) {
    return '';
  }

  // If it is a file URL, local file path, or corrupted local path with https:// protocol
  if (
    address.match(/^file:\/\//i) ||
    address.match(/^https?:\/\/[a-zA-Z]:[\\/]/i) ||
    address.match(/^[a-zA-Z]:[\\/]/i) ||
    (address.startsWith('/') && !address.startsWith('//'))
  ) {
    return formatLocalPathToUrl(address);
  }

  // Check if the input is a search query rather than a URL
  if (detectSearchQuery && isSearchQuery(address)) {
    return `https://google.com/search?q=${encodeURIComponent(address)}`;
  }

  const protocolRegex = /^(?:https?:\/\/|file:\/\/|ftp:\/\/|www\.)/i;
  const localhostRegex = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;

  if (localhostRegex.test(address)) {
    if (!address.match(/^https?:\/\//i)) {
      return 'http://' + address;
    }
    return address;
  }

  let formattedAddress = address;

  // Remove www. prefix if present
  if (formattedAddress.match(/^(?:https?:\/\/)?www\./i)) {
    formattedAddress = formattedAddress.replace(/^(https?:\/\/)?www\./i, '$1');
  }

  // Remove trailing slash if present
  formattedAddress = formattedAddress.replace(/\/$/, '');

  if (protocolRegex.test(address)) {
    if (address.startsWith('www.') && !address.match(/^https?:\/\//i)) {
      return 'https://' + formattedAddress;
    }
    return formattedAddress;
  } else {
    return 'https://' + formattedAddress;
  }
}

/**
 * Gets a display name for a URL.
 * @param {string} url - The URL.
 * @returns {string} The display name.
 */
export function getUrlName(url: string): string {
  try {
    const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname;

    if (hostname === 'localhost') {
      return hostname + (parsedUrl.port ? `:${parsedUrl.port}` : '');
    }

    const hostnameParts = hostname.split('.');
    if (hostnameParts.length >= 2) {
      const domain = hostnameParts[hostnameParts.length - 2];

      if (normalizedUrl.includes(hostname) && normalizedUrl.length > hostname.length + 8) {
        const path = parsedUrl.pathname;
        const formattedPath = hostname + path;
        return formattedPath.replace(/^\/+/, '');
      }

      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }

    return hostname;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return url;
  }
}

/**
 * Compares two URLs for equality using normalize-url.
 * @param {string} firstUrl - The first URL.
 * @param {string} secondUrl - The second URL.
 * @param {'https' | 'http'} [defaultProtocol] - Default protocol to use.
 * @returns {Promise<boolean>} True if URLs are equal.
 */
export async function compareUrls(
  firstUrl: string,
  secondUrl: string,
  defaultProtocol?: 'https' | 'http' | undefined,
): Promise<boolean> {
  if (isEqual(firstUrl, secondUrl)) return true;

  try {
    const options: Options = {
      defaultProtocol: defaultProtocol || 'https',
    };

    return normalizeUrl(firstUrl, options) === normalizeUrl(secondUrl, options);
  } catch (e) {
    console.error('Comparing Urls', e);
    return false;
  }
}

/**
 * Generates a search URL for a given text and site.
 * @param {string} text - The search text.
 * @param {SearchQuerySites} site - The search site.
 * @returns {string} The search URL.
 */
export function getSearchUrl(text: string, site: SearchQuerySites): string {
  const encodedText = encodeURIComponent(text);
  let urlTemplate: string;

  switch (site) {
    case 'Reddit':
      urlTemplate = 'http://www.reddit.com/search?q=%s';
      break;
    case 'DuckDuckGo':
      urlTemplate = 'https://duckduckgo.com/?q=%s';
      break;
    case 'Perplexity':
      urlTemplate = 'https://www.perplexity.ai/?q=%s';
      break;
    case 'ChatGPT':
      urlTemplate = 'https://chatgpt.com/?q=%s';
      break;
    case 'Claude':
      urlTemplate = 'https://claude.ai/new?q=%s';
      break;
    case 'Google':
    default:
      urlTemplate = 'https://google.com/search?q=%s';
      break;
  }

  return urlTemplate.replace('%s', encodedText);
}

/**
 * Generates a cache URL for a given image URL.
 * Use this URL in img src to load images through the cache.
 * @param {string | undefined} url - The original image URL
 * @returns {string | undefined} The cache protocol URL
 */
export function getCacheUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return `lynxcache://fetch/${encodeURIComponent(url)}`;
}
