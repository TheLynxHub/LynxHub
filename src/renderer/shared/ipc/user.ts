import {userChannels} from '@lynx_common/consts/ipcChannels/user';
import type {SubscribeStages, UserAccountData} from '@lynx_common/types';

import lynxIpc from './lynxIpc';

const userIpc = {
  account: {
    // Gets user account information
    getInfo: (): Promise<UserAccountData | null> => lynxIpc.invoke(userChannels.account.getInfo),
    // Logs in to website account
    login: (): Promise<UserAccountData> => lynxIpc.invoke(userChannels.account.login),
    // Logs out from website account
    logout: (): Promise<void> => lynxIpc.invoke(userChannels.account.logout),
    // Checks if the user starred the GitHub repo
    checkGitHubStar: (): Promise<{connected: boolean; starred: boolean}> =>
      lynxIpc.invoke(userChannels.account.checkGitHubStar),
    // Stars the GitHub repository
    starGitHubRepo: (): Promise<{success: boolean; error?: string}> =>
      lynxIpc.invoke(userChannels.account.starGitHubRepo),
    // Submits feedback/creates GitHub issue
    submitFeedback: (feedback: {
      title: string;
      body: string;
    }): Promise<{success: boolean; url?: string; error?: string}> =>
      lynxIpc.invoke(userChannels.account.submitFeedback, feedback),
    // Updates subscription channel
    updateChannel: (channel: SubscribeStages | 'get'): void =>
      lynxIpc.send(userChannels.account.updateChannel, channel),

    // Listens for release channel changes
    onReleaseChannel: (result: (stage: SubscribeStages) => void) =>
      lynxIpc.on(userChannels.account.onReleaseChannel, result),
    // Listens for user data changes
    onUserDataChange: (result: (userData: UserAccountData | null) => void) =>
      lynxIpc.on(userChannels.account.onUserDataChange, result),
  },
};

export default userIpc;
