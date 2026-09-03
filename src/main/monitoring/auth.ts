import {LYNXHUB_WEBSITE} from '@lynx_common/consts';
import {SubscribeStages, UserAccountData} from '@lynx_common/types';
import {isDev, toMs} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import {userIpc} from '@lynx_main/ipc/user';
import classHolder from '@lynx_main/managers/classHolder';
import axios from 'axios';
import {app, ipcMain, shell} from 'electron';
import {autoUpdater} from 'electron-updater';

import {
  deleteCachedUser,
  deleteTokens,
  getCachedUser,
  getChannel,
  getTokens,
  saveCachedUser,
  saveChannel,
  saveTokens,
} from './token';

// Constants
export const AUTH_CHANNEL_KEY = isDev() ? 'LynxHub-Dev-Auth-Update-Channel' : 'LynxHub-Auth-Update-Channel';
export const AUTH_LOGIN_KEY = isDev() ? 'LynxHub-Dev-Auth-Login-User' : 'LynxHub-Auth-Login-User';
const UPDATE_CHECK_COOLDOWN = toMs(15, 'minutes');
let lastUpdateCheckTime = 0;

// Internal user data representation including sensitive release tokens
interface InternalUserAccountData extends UserAccountData {
  updateToken?: string | null;
}

// Pending login promise resolvers
let pendingLoginResolve: ((value: UserAccountData) => void) | null = null;
let pendingLoginReject: ((err: any) => void) | null = null;

/**
 * Handles custom protocol deep links (e.g. lynxhub://auth?token=...)
 */
export async function handleDeepLink(url: string) {
  try {
    if (!app.isReady()) {
      await app.whenReady();
    }
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'auth') {
      const token = parsedUrl.searchParams.get('token');
      if (token) {
        await processTokenLogin(token);
      }
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
}

/**
 * Verify token and complete authentication
 */
async function processTokenLogin(token: string) {
  try {
    const userData = await verifyTokenWithWebsite(token);

    // Save token, channel configuration, and cached user profile
    await saveTokens(AUTH_LOGIN_KEY, token);
    await saveChannel(AUTH_CHANNEL_KEY, userData.subscribeStage);
    const {updateToken: _updateToken, ...publicUserData} = userData;
    await saveCachedUser(AUTH_LOGIN_KEY, publicUserData);

    // Update UI and configure auto updater
    await refreshChannel(true, userData.subscribeStage);
    checkForAppUpdate(userData.subscribeStage, userData.updateToken, true);

    const {updateToken, ...rendererUserData} = userData;
    userIpc.account.send.onUserDataChange(rendererUserData);

    if (pendingLoginResolve) {
      pendingLoginResolve(rendererUserData);
      pendingLoginResolve = null;
      pendingLoginReject = null;
    }
  } catch (error) {
    console.error('Failed to complete login via token:', axios.isAxiosError(error) ? error.message : error);
    if (pendingLoginReject) {
      pendingLoginReject(error);
      pendingLoginResolve = null;
      pendingLoginReject = null;
    }
  }
}

/**
 * Verifies the token with the website's API and returns user data.
 */
async function verifyTokenWithWebsite(token: string): Promise<InternalUserAccountData> {
  const response = await axios.get(`${LYNXHUB_WEBSITE}/api/user/session`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });

  const user = response.data;

  // Map subscribeStage to matching tier name for UI compatibility
  const tierMap: Record<SubscribeStages, string> = {
    insider: 'Insider Supporter',
    early_access: 'Early Access Supporter',
    public: 'Free Account',
  };

  return {
    tier: tierMap[user.subscribeStage as SubscribeStages] || 'Free Account',
    name: user.name,
    imageUrl: user.imageUrl,
    subscribeStage: user.subscribeStage as SubscribeStages,
    updateToken: user.updateToken,
    connectedProviders: user.connectedProviders || [],
  };
}

/**
 * Checks if the user is already logged in by verifying the stored token.
 */
export async function checkExistingLogin(): Promise<{
  isLoggedIn: boolean;
  userData?: InternalUserAccountData;
  isOffline?: boolean;
}> {
  const token = await getTokens(AUTH_LOGIN_KEY);
  if (!token) {
    return {isLoggedIn: false};
  }

  try {
    const userData = await verifyTokenWithWebsite(token);
    // Cache latest profile on successful verification
    const {updateToken: _token, ...publicUserData} = userData;
    await saveCachedUser(AUTH_LOGIN_KEY, publicUserData);
    return {
      isLoggedIn: true,
      userData,
      isOffline: false,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      console.warn('Stored token is invalid or expired. Logging out.');
      await deleteTokens(AUTH_LOGIN_KEY);
      await deleteCachedUser(AUTH_LOGIN_KEY);
      await saveChannel(AUTH_CHANNEL_KEY, 'public');
      return {isLoggedIn: false};
    }

    // Network error / Offline / Timeout
    console.warn(
      'Failed to verify token with website (network/server issue), falling back to cached profile:',
      error instanceof Error ? error.message : error,
    );
    const cachedUser = await getCachedUser(AUTH_LOGIN_KEY);
    const cachedChannel = await getChannel(AUTH_CHANNEL_KEY);

    if (cachedUser) {
      return {
        isLoggedIn: true,
        userData: {
          ...cachedUser,
          subscribeStage: cachedChannel || cachedUser.subscribeStage || 'public',
        },
        isOffline: true,
      };
    }

    // Token exists but no cached profile yet -> keep logged in with fallback
    return {
      isLoggedIn: true,
      userData: {
        tier: 'Offline Supporter',
        name: 'Logged-in User',
        imageUrl: '',
        subscribeStage: cachedChannel || 'public',
        connectedProviders: [],
      },
      isOffline: true,
    };
  }
}

/**
 * Refreshes the channel based on login status and tier.
 */
async function refreshChannel(isLogin: boolean, stage: SubscribeStages) {
  if (isLogin && (stage === 'insider' || stage === 'early_access')) {
    await saveChannel(AUTH_CHANNEL_KEY, stage);
    applicationIpc.send.updateChannelChange(stage);
  } else {
    await saveChannel(AUTH_CHANNEL_KEY, 'public');
    applicationIpc.send.updateChannelChange('public');
  }
}

/**
 * Safely validates existing login and returns the user's authorized subscription stage.
 * If logged out or token is invalid/expired, returns 'public'.
 * If offline, preserves the cached subscription stage.
 */
export async function getValidatedUserStage(): Promise<SubscribeStages> {
  const token = await getTokens(AUTH_LOGIN_KEY);
  const cachedChannel = await getChannel(AUTH_CHANNEL_KEY);

  if (!token) {
    await saveChannel(AUTH_CHANNEL_KEY, 'public');
    return 'public';
  }

  const {isLoggedIn, userData, isOffline} = await checkExistingLogin();
  if (!isLoggedIn) {
    await saveChannel(AUTH_CHANNEL_KEY, 'public');
    return 'public';
  }

  if (isOffline) {
    // Preserve previously authorized stage in offline mode
    return cachedChannel || 'public';
  }

  const stage = (userData?.subscribeStage as SubscribeStages) || 'public';
  if (stage === 'insider' || stage === 'early_access') {
    await saveChannel(AUTH_CHANNEL_KEY, stage);
    return stage;
  }

  await saveChannel(AUTH_CHANNEL_KEY, 'public');
  return 'public';
}

/**
 * Configures the auto-updater based on the subscription stage.
 */
function checkForAppUpdate(stage: SubscribeStages, updateToken?: string | null, force: boolean = false) {
  const provider = 'github';
  const owner = 'TheLynxHub';

  if (stage === 'insider' || stage === 'early_access') {
    const repo = stage === 'insider' ? 'Insider-Releases' : 'EA-Releases';

    if (updateToken) {
      process.env.GH_TOKEN = updateToken;
    } else {
      delete process.env.GH_TOKEN;
    }

    autoUpdater.setFeedURL({
      provider,
      owner,
      repo,
      private: true,
      token: updateToken || undefined,
    });

    autoUpdater.disableDifferentialDownload = true;
  } else {
    delete process.env.GH_TOKEN;
    autoUpdater.setFeedURL({
      provider,
      owner,
      repo: 'LynxHub',
      private: false,
    });
  }

  const now = Date.now();
  if (force || now - lastUpdateCheckTime >= UPDATE_CHECK_COOLDOWN) {
    lastUpdateCheckTime = now;
    autoUpdater.checkForUpdates().catch(e => {
      console.warn('autoUpdater.checkForUpdates failed:', e?.message || e);
    });
  }
}

/**
 * Sets up IPC listeners for Account authentication (which redirects to website auth) and channel management.
 */
export default function Auth() {
  userIpc.account.handle.getInfo(async () => {
    try {
      const existingLogin = await checkExistingLogin();

      if (existingLogin.isLoggedIn && existingLogin.userData) {
        let currentChannel = await getChannel(AUTH_CHANNEL_KEY);
        let channelChanged = false;
        if (!existingLogin.isOffline && existingLogin.userData.subscribeStage !== currentChannel) {
          await saveChannel(AUTH_CHANNEL_KEY, existingLogin.userData.subscribeStage);
          await refreshChannel(true, existingLogin.userData.subscribeStage);
          currentChannel = existingLogin.userData.subscribeStage;
          channelChanged = true;
        }
        if (!existingLogin.isOffline) {
          checkForAppUpdate(currentChannel, existingLogin.userData.updateToken, channelChanged);
        }
        const {updateToken, ...rendererUserData} = existingLogin.userData;
        return {...rendererUserData, subscribeStage: currentChannel};
      } else {
        checkForAppUpdate('public', null, false);
        return null;
      }
    } catch (e) {
      console.info('Auth failed to update channel', e);
      return null;
    }
  });

  userIpc.account.handle.login(async () => {
    const authUrl = `${LYNXHUB_WEBSITE}/auth/app`;

    const {storageManager} = classHolder;
    if (storageManager.getData('app').openLinkExternal) {
      shell.openExternal(authUrl).catch(_e => {
        // console.error('Error on openExternal: ', _e);
      });
    } else {
      applicationIpc.send.onNewTab(authUrl);
    }

    return new Promise<UserAccountData>((resolve, reject) => {
      pendingLoginResolve = resolve;
      pendingLoginReject = reject;
    });
  });

  userIpc.account.handle.logout(async () => {
    try {
      await deleteTokens(AUTH_LOGIN_KEY);
      await deleteCachedUser(AUTH_LOGIN_KEY);
      await refreshChannel(false, 'public');
      checkForAppUpdate('public', null, true);
      userIpc.account.send.onUserDataChange(null);
      return;
    } catch (error) {
      await deleteTokens(AUTH_LOGIN_KEY);
      await deleteCachedUser(AUTH_LOGIN_KEY);
      await refreshChannel(false, 'public');
      checkForAppUpdate('public', null, true);
      userIpc.account.send.onUserDataChange(null);
      throw error;
    }
  });

  userIpc.account.handle.checkGitHubStar(async () => {
    try {
      const token = await getTokens(AUTH_LOGIN_KEY);
      if (!token) {
        return {connected: false, starred: false};
      }

      const response = await axios.get(`${LYNXHUB_WEBSITE}/api/github/star`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (e) {
      console.error('Error checking github star in main process:', e);
      return {connected: false, starred: false};
    }
  });

  userIpc.account.handle.starGitHubRepo(async () => {
    try {
      const token = await getTokens(AUTH_LOGIN_KEY);
      if (!token) {
        return {success: false, error: 'Not logged in'};
      }

      const response = await axios.post(
        `${LYNXHUB_WEBSITE}/api/github/star`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        },
      );

      return response.data;
    } catch (e) {
      console.error('Error starring repository in main process:', e);
      return {
        success: false,
        error: axios.isAxiosError(e) && e.response?.data?.error ? e.response.data.error : 'Failed to star repository',
      };
    }
  });

  userIpc.account.handle.submitFeedback(async feedback => {
    try {
      const token = await getTokens(AUTH_LOGIN_KEY);
      if (!token) {
        return {success: false, error: 'Not logged in'};
      }

      const response = await axios.post(`${LYNXHUB_WEBSITE}/api/github/create-issue`, feedback, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      });

      return response.data;
    } catch (e) {
      console.error('Error submitting feedback in main process:', e);
      return {
        success: false,
        error: axios.isAxiosError(e) && e.response?.data?.error ? e.response.data.error : 'Failed to submit feedback',
      };
    }
  });

  userIpc.account.on.updateChannel(async channel => {
    if (channel === 'get') {
      const currentChannel = await getChannel(AUTH_CHANNEL_KEY);
      applicationIpc.send.updateChannelChange(currentChannel);
    }
  });

  // Handle user-initiated login cancellation
  ipcMain.removeAllListeners('patreon-cancel-process');
  ipcMain.on('patreon-cancel-process', () => {
    if (pendingLoginReject) {
      pendingLoginReject(new Error('OAuth process cancelled by user'));
      pendingLoginResolve = null;
      pendingLoginReject = null;
    }
  });
}
