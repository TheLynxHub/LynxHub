import {CardInfoApi, CardInfoCallback, CardInfoDescriptions} from '@lynx_common/types/plugins/modules';
import filesIpc from '@lynx_shared/ipc/files';
import lynxIpc from '@lynx_shared/ipc/lynxIpc';
import {moduleApiIpc} from '@lynx_shared/ipc/plugins/module';
import storageIpc from '@lynx_shared/ipc/storage';
import {isEmpty} from 'lodash-es';
import {useEffect} from 'react';

import {getCardMethod, useAllCardMethods} from '../../../../../plugins/modules';

export default function useCardInfoApi(
  cardId: string,
  setOpenFolders: (folders: string[] | undefined) => void,
  setCardInfoDescriptions: (descriptions: CardInfoDescriptions) => void,
  dir?: string,
) {
  const allMethods = useAllCardMethods();

  useEffect(() => {
    if (!isEmpty(cardId)) {
      const api: CardInfoApi = {
        installationFolder: dir,
        ipc: {
          on(channel: string, listener: any): () => void {
            return lynxIpc.on(channel, listener);
          },
          send(channel: string, ...args: any[]) {
            return lynxIpc.send(channel, ...args);
          },
          invoke(channel: string, ...args: any[]): Promise<any> {
            return lynxIpc.invoke(channel, ...args);
          },
        },
        storage: {
          get: (key: string) => storageIpc.getCustom(key.includes('::') ? key : `${cardId}::${key}`),
          set: (key: string, data: any) => storageIpc.setCustom(key.includes('::') ? key : `${cardId}::${key}`, data),
        },
        getFolderSize: (path: string) => filesIpc.calcFolderSize(path),
        getFolderCreationTime: (path: string) => moduleApiIpc.getFolderCreationTime(path),
        getLastPulledDate: (path: string) => moduleApiIpc.getLastPulledDate(path),
        getCurrentReleaseTag: (path: string) => moduleApiIpc.getCurrentReleaseTag(path),
      };

      const callBack: CardInfoCallback = {setOpenFolders, setDescription: setCardInfoDescriptions};

      try {
        getCardMethod(allMethods, cardId, 'cardInfo')?.(api, callBack);
      } catch (error) {
        console.error('Failed to execute cardInfo method:', error);
      }
    }
  }, [cardId, dir, allMethods, setOpenFolders, setCardInfoDescriptions]);
}
