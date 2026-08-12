import {InitialSteps, InstallationStepper} from '@lynx_common/types/plugins/modules';
import {ToastFunction} from '@lynx_common/utils/toast';
import filesIpc from '@lynx_shared/ipc/files';
import gitIpc from '@lynx_shared/ipc/git';
import lynxIpc from '@lynx_shared/ipc/lynxIpc';
import moduleIpc from '@lynx_shared/ipc/plugins/module';
import ptyIpc from '@lynx_shared/ipc/pty';
import storageIpc, {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import utilsIpc from '@lynx_shared/ipc/utils';
import {isNil} from 'lodash-es';
import {FC} from 'react';

import {extensionRendererApi} from '../../../../../plugins/extensions/loader';
import {collectExtensionUserInputs} from '../../../../../plugins/extensions/utils';
import {allCardMethods, getCardMethod} from '../../../../../plugins/modules';
import {cardsActions} from '../../../../../redux/reducers/cards';
import {getStore} from '../../../../../redux/store';
import {useInstallStore} from './store';

export interface InstallStepperData {
  cardId: string;
  topToast: ToastFunction;
  bottomToast: ToastFunction;
  allMethods: any[];
}

/**
 * Manages the sequential logic and external integrations for the installation process.
 * Connects directly to `useInstallStore` for state transitions and promise resolution.
 */
export default class InstallStepper implements InstallationStepper {
  private readonly cardId: string;
  private totalSteps: number;
  private customStepContents: {index: number; content: FC}[];
  private nextStepResolver?: () => void;

  public topToast: ToastFunction;
  public bottomToast: ToastFunction;

  public ipc: InstallationStepper['ipc'];
  public storage: InstallationStepper['storage'];
  public utils: InstallationStepper['utils'];
  public postInstall: InstallationStepper['postInstall'];

  constructor(data: InstallStepperData) {
    this.totalSteps = 0;
    this.customStepContents = [];
    this.cardId = data.cardId;

    this.topToast = data.topToast;
    this.bottomToast = data.bottomToast;

    this.ipc = {
      on: (channel: string, listener: any) => lynxIpc.on(channel, listener),
      send: (channel: string, ...args) => lynxIpc.send(channel, ...args),
      invoke: (channel: string, ...args) => lynxIpc.invoke(channel, ...args),
    };

    this.storage = {
      set: (key, dataVal) => storageIpc.setCustom(`${this.cardId}::${key}`, dataVal),
      get: key => storageIpc.getCustom(`${this.cardId}::${key}`),
    };

    this.utils = {
      decompressFile: utilsIpc.decompressFile,
      validateGitRepository: gitIpc.validateGitDir,
      verifyFilesExist: filesIpc.checkFilesExist,
      openFileOrFolder: filesIpc.openPath,
    };

    this.postInstall = {
      installExtensions: (extensionURLs, extensionsDir) => this.installExtensions(extensionURLs, extensionsDir),
      config: config => {
        const {autoUpdateExtensions, autoUpdateCard, launchBehavior, preLaunch, customCommands, customArguments} =
          config;
        if (autoUpdateCard !== undefined) {
          if (autoUpdateCard) {
            storageUtilsIpc.send.addAutoUpdateCard(data.cardId);
          } else {
            storageUtilsIpc.send.removeAutoUpdateCard(data.cardId);
          }
        }
        if (autoUpdateExtensions !== undefined) {
          if (autoUpdateExtensions) {
            storageUtilsIpc.send.addAutoUpdateExtensions(data.cardId);
          } else {
            storageUtilsIpc.send.removeAutoUpdateExtensions(data.cardId);
          }
        }
        if (customArguments !== undefined) {
          storageUtilsIpc.invoke.getCardArguments(data.cardId).then(result => {
            storageUtilsIpc.invoke.setCardArguments(data.cardId, {
              activePreset: customArguments.presetName,
              data: [...result.data, {preset: customArguments.presetName, arguments: customArguments.customArguments}],
            });
          });
        }
        if (preLaunch !== undefined) {
          storageUtilsIpc.invoke.preCommands('set', {command: preLaunch.preCommands, id: data.cardId});
          preLaunch.openPath.forEach(({path, type}) => {
            storageUtilsIpc.invoke.preOpen('add', {id: data.cardId, open: {path, type}});
          });
        }
        if (launchBehavior !== undefined) {
          const {browser, terminal, urlCatch} = launchBehavior;
          storageUtilsIpc.send.updateCustomRunBehavior({
            cardID: data.cardId,
            terminal,
            browser,
            urlCatch,
          });
        }
        if (customCommands !== undefined) {
          storageUtilsIpc.invoke.customRun('set', {command: customCommands, id: data.cardId});
        }
      },
    };
  }

  public initialSteps(steps: InitialSteps) {
    this.totalSteps = steps.length - 1;
    useInstallStore.getState().setSteps(steps);

    extensionRendererApi.events.emit('card_install_addStep', {
      id: this.cardId,
      addStep: (atIndex, title, content) => {
        useInstallStore.getState().setSteps(prevSteps => prevSteps.toSpliced(atIndex, 0, title));
        this.customStepContents.push({index: atIndex, content});
        this.totalSteps += 1;
      },
    });
  }

  public async nextStep() {
    return new Promise<void>(resolve => {
      if (!this.nextStepResolver) this.nextStepResolver = resolve;
      useInstallStore.getState().setCurrentStep(prevState => {
        const stepNumber = prevState < this.totalSteps ? prevState + 1 : prevState;
        const customStep = this.customStepContents.find(step => step.index === stepNumber);

        if (customStep) {
          useInstallStore
            .getState()
            .updateState({body: 'extension-custom', extensionCustomContent: customStep?.content});
        } else if (this.nextStepResolver) {
          this.nextStepResolver();
          this.nextStepResolver = undefined;
        }

        return stepNumber;
      });
    });
  }

  public starterStep = async (options?: {disableSelectDir?: boolean}) => {
    return new Promise<any>(resolve => {
      useInstallStore.getState().setStarterResolver(resolve);
      useInstallStore.getState().updateState({body: 'starter', disableSelectDir: options?.disableSelectDir});
    });
  };

  public cloneRepository = async (url: string) => {
    return new Promise<string>(resolve => {
      useInstallStore.getState().setCloneResolver(resolve);
      useInstallStore.getState().updateState({cloneUrl: url, body: 'clone'});
    });
  };

  public runTerminalScript = async (workingDirectory: string, scriptFileName: string) => {
    return new Promise<void>(resolve => {
      const restartFn = () => {
        ptyIpc.stop(this.cardId);
        ptyIpc.customProcess(this.cardId, workingDirectory, scriptFileName);
      };

      useInstallStore.getState().setTerminalResolver(resolve);
      useInstallStore.getState().setRestartTerminalFn(restartFn);
      useInstallStore.getState().updateState(prev => ({body: 'terminal', terminalKey: prev.terminalKey + 1}));
      ptyIpc.customProcess(this.cardId, workingDirectory, scriptFileName);
    });
  };

  public executeTerminalCommands = async (commands?: string | string[], workingDirectory?: string) => {
    return new Promise<void>(resolve => {
      const restartFn = () => {
        ptyIpc.stop(this.cardId);
        ptyIpc.customCommands(this.cardId, commands, workingDirectory);
      };

      useInstallStore.getState().setTerminalResolver(resolve);
      useInstallStore.getState().setRestartTerminalFn(restartFn);
      useInstallStore.getState().updateState(prev => ({body: 'terminal', terminalKey: prev.terminalKey + 1}));
      ptyIpc.customCommands(this.cardId, commands, workingDirectory);
    });
  };

  public downloadFileFromUrl = async (url: string) => {
    return new Promise<string>(resolve => {
      const store = useInstallStore.getState();
      store.setProgressInfo(undefined);
      store.setUrlToDownload(url);
      store.updateState({body: 'progress'});

      utilsIpc.downloadFile(url);
      const removeListener = utilsIpc.onDownloadFile(progress => {
        if (progress.stage === 'done') {
          useInstallStore.getState().setProgressInfo(undefined);
          removeListener();
          resolve(progress.finalPath);
        } else {
          useInstallStore.getState().setProgressInfo(progress);
        }
      });

      store.setRemoveProgressListenerFn(removeListener);
    });
  };

  public collectUserInput = async (inputFields: any[], title?: string) => {
    return new Promise<any[]>(resolve => {
      collectExtensionUserInputs(this.cardId, extensionUserInput => {
        const store = useInstallStore.getState();
        store.setUserInputResolver(resolve);
        store.setUserInputElements({elements: inputFields, title});
        store.updateState({body: 'user-input', extensionUserInput});
      });
    });
  };

  public installExtensions = async (extensionURLs: string[], extensionsDir: string) => {
    return new Promise<void>(resolve => {
      const store = useInstallStore.getState();
      store.setExtensionsResolver(resolve);
      store.setExtensionsToInstall({urls: extensionURLs, dir: extensionsDir});
      store.updateState({body: 'install-extensions'});
    });
  };

  public progressBar = (
    isIndeterminate: boolean,
    title?: string,
    percentage?: number,
    description?: {label: string; value: string}[],
  ) => {
    const store = useInstallStore.getState();
    store.updateState({body: 'progress-bar'});
    store.setProgressBarState({title, isIndeterminate, percentage, description});
  };

  public setInstalled = (dir?: string) => {
    storageUtilsIpc.send.addInstalledCard({dir, id: this.cardId});
    this.checkForUpdate(dir);
  };

  public setUpdated = () => {
    getStore().dispatch(cardsActions.removeUpdateAvailable(this.cardId));
  };

  public showFinalStep = (type: 'success' | 'error', title: string, description?: string) => {
    useInstallStore.getState().setCurrentStep(this.totalSteps);
    useInstallStore.getState().updateState({doneAll: {type, title, description}, body: 'done'});
  };

  private checkForUpdate = (dir: string | undefined) => {
    const methods = getCardMethod(allCardMethods, this.cardId, 'manager');
    const updateType = methods?.updater?.updateType;
    if (!isNil(updateType)) {
      moduleIpc.cardUpdateAvailable({dir, id: this.cardId}, updateType).then((isAvailable: boolean) => {
        if (isAvailable) getStore().dispatch(cardsActions.addUpdateAvailable(this.cardId));
      });
    }
  };
}
