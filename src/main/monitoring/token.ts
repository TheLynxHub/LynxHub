import fs from 'node:fs';
import {join} from 'node:path';

import {APP_NAME} from '@lynx_common/consts';
import {SubscribeStages, UserAccountData} from '@lynx_common/types';
import {isDev} from '@lynx_common/utils';
import {userIpc} from '@lynx_main/ipc/user';
import {decryptString, encryptString, getExePath, isPortable} from '@lynx_main/utils';
import {app, safeStorage} from 'electron';

const CREDENTIALS_FILE = 'auth-credentials.json';
const DEV_CREDENTIALS_FILE = 'auth-credentials-dev.json';

function getCredentialsFilePath(): string {
  const fileName = isDev() ? DEV_CREDENTIALS_FILE : CREDENTIALS_FILE;
  if (isPortable()) {
    return join(getExePath(), `${APP_NAME}_Data`, fileName);
  }
  return join(app.getPath('userData'), fileName);
}

interface CredentialsData {
  tokens: Record<string, string>; // userId -> encrypted token
  channels: Record<string, SubscribeStages>; // userId -> channel
  cachedUsers?: Record<string, UserAccountData>; // userId -> cached user profile data
}

function loadCredentials(): CredentialsData {
  const filePath = getCredentialsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return {
        tokens: parsed.tokens || {},
        channels: parsed.channels || {},
        cachedUsers: parsed.cachedUsers || {},
      };
    }
  } catch (error) {
    console.error('Failed to load credentials file:', error);
  }
  return {tokens: {}, channels: {}, cachedUsers: {}};
}

function saveCredentials(data: CredentialsData): boolean {
  const filePath = getCredentialsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save credentials file:', error);
    return false;
  }
}

/**
 * Saves the access token for the given user securely.
 * Encrypts the token using Electron's safeStorage.
 */
export async function saveTokens(userId: string, accessToken: string): Promise<boolean> {
  try {
    const encrypted = encryptString(accessToken);
    const creds = loadCredentials();
    creds.tokens[userId] = encrypted;
    return saveCredentials(creds);
  } catch (error) {
    console.error(`Failed to save tokens securely for user ${userId}:`, error);
    return false;
  }
}

/**
 * Retrieves the access token for the given user securely.
 * Decrypts the token using Electron's safeStorage.
 */
export async function getTokens(userId: string): Promise<string | null> {
  try {
    const creds = loadCredentials();
    const encrypted = creds.tokens[userId];
    if (encrypted) {
      const decrypted = decryptString(encrypted);
      if (safeStorage.isEncryptionAvailable() && decrypted === encrypted) {
        console.warn(`Failed to decrypt tokens for user ${userId} (key mismatch or corrupted credential).`);
        return null;
      }
      return decrypted || null;
    }
    return null;
  } catch (error) {
    console.error(`Failed to retrieve tokens for user ${userId}:`, error);
    return null;
  }
}

/**
 * Deletes the access and refresh tokens for the given user.
 */
export async function deleteTokens(userId: string): Promise<boolean> {
  try {
    const creds = loadCredentials();
    delete creds.tokens[userId];
    return saveCredentials(creds);
  } catch (error) {
    console.error(`Failed to delete tokens for user ${userId}:`, error);
    return false;
  }
}

/**
 * Saves the subscription channel for the given user securely.
 */
export async function saveChannel(userId: string, channel: SubscribeStages): Promise<boolean> {
  try {
    const creds = loadCredentials();
    creds.channels[userId] = channel;
    const success = saveCredentials(creds);
    if (success) {
      userIpc.account.send.onReleaseChannel(channel);
    }
    return success;
  } catch (error) {
    console.error(`Failed to save channel for user ${userId}:`, error);
    return false;
  }
}

/**
 * Retrieves the subscription channel for the given user securely.
 * Handles migration from 'ea' to 'early_access'.
 */
export async function getChannel(userId: string): Promise<SubscribeStages> {
  let stage: SubscribeStages | 'ea' | null = null;

  try {
    const creds = loadCredentials();
    stage = (creds.channels[userId] as SubscribeStages | 'ea' | undefined) || null;
  } catch (error) {
    console.error(`Failed to retrieve channel for user ${userId}:`, error);
  }

  // Migrate 'ea' to 'early_access'
  if (stage === 'ea') {
    await saveChannel(userId, 'early_access');
    stage = 'early_access';
  } else if (!stage) {
    stage = 'public';
  }

  // Ensure the UI is updated with the current stage
  if (stage) {
    userIpc.account.send.onReleaseChannel(stage as SubscribeStages);
  }

  return stage as SubscribeStages;
}

/**
 * Saves the cached user profile data for the given user.
 */
export async function saveCachedUser(userId: string, data: UserAccountData): Promise<boolean> {
  try {
    const creds = loadCredentials();
    if (!creds.cachedUsers) {
      creds.cachedUsers = {};
    }
    creds.cachedUsers[userId] = data;
    return saveCredentials(creds);
  } catch (error) {
    console.error(`Failed to save cached user profile for user ${userId}:`, error);
    return false;
  }
}

/**
 * Retrieves the cached user profile data for the given user.
 */
export async function getCachedUser(userId: string): Promise<UserAccountData | null> {
  try {
    const creds = loadCredentials();
    return creds.cachedUsers?.[userId] || null;
  } catch (error) {
    console.error(`Failed to retrieve cached user profile for user ${userId}:`, error);
    return null;
  }
}

/**
 * Deletes the cached user profile data for the given user.
 */
export async function deleteCachedUser(userId: string): Promise<boolean> {
  try {
    const creds = loadCredentials();
    if (creds.cachedUsers && creds.cachedUsers[userId]) {
      delete creds.cachedUsers[userId];
      return saveCredentials(creds);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete cached user profile for user ${userId}:`, error);
    return false;
  }
}
