import {userChannels} from '@lynx_common/consts/ipcChannels/user';
import {SubscribeStages, UserAccountData} from '@lynx_common/types';
import {MainHT} from '@lynx_common/types/ipc';

import lynxIpc from './ipcWrapper';
import {sendToMain} from './sender';

/**
 * IPC interface for user-related operations (Account).
 * Note: Handlers are registered in src/main/monitoring/auth.ts
 */
export const userIpc = {
  account: {
    send: {
      /** Sends release channel update */
      onReleaseChannel: (channel: SubscribeStages) => sendToMain(userChannels.account.onReleaseChannel, channel),
      /** Sends user data change update */
      onUserDataChange: (userData: UserAccountData | null) =>
        sendToMain(userChannels.account.onUserDataChange, userData),
    },
    on: {
      /** Listens for channel update request */
      updateChannel: (callback: (channel: SubscribeStages | 'get') => void) =>
        lynxIpc.on(userChannels.account.updateChannel, callback),
    },
    handle: {
      /** Handles get info request */
      getInfo: (callback: () => MainHT<UserAccountData | null>) =>
        lynxIpc.handle(userChannels.account.getInfo, callback),
      /** Handles login request */
      login: (callback: () => MainHT<UserAccountData>) => lynxIpc.handle(userChannels.account.login, callback),
      /** Handles logout request */
      logout: (callback: () => MainHT<void>) => lynxIpc.handle(userChannels.account.logout, callback),
      /** Handles check github star request */
      checkGitHubStar: (callback: () => MainHT<{connected: boolean; starred: boolean}>) =>
        lynxIpc.handle(userChannels.account.checkGitHubStar, callback),
      /** Handles star github repo request */
      starGitHubRepo: (callback: () => MainHT<{success: boolean; error?: string}>) =>
        lynxIpc.handle(userChannels.account.starGitHubRepo, callback),
      /** Handles submit feedback request */
      submitFeedback: (
        callback: (feedback: {title: string; body: string}) => MainHT<{success: boolean; url?: string; error?: string}>,
      ) => lynxIpc.handle(userChannels.account.submitFeedback, callback),
    },
  },
};
