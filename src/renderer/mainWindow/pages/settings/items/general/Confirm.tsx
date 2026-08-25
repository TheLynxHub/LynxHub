import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Manage confirmation modal preferences before executing critical actions
 * such as closing the app, closing terminal tabs, or terminating the AI process.
 */
export default function Confirm() {
  const closeConfirm = useSettingsState('closeConfirm');
  const closeTabConfirm = useSettingsState('closeTabConfirm');
  const terminateAIConfirm = useSettingsState('terminateAIConfirm');
  const exitSignalConfirm = useSettingsState('exitSignalConfirm');
  const forceReloadConfirm = useSettingsState('forceReloadConfirm');

  const dispatch = useDispatch<AppDispatch>();

  const onCloseConfirmChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {closeConfirm: selected});
      dispatch(settingsActions.setSettingsState({key: 'closeConfirm', value: selected}));
    },
    [dispatch],
  );

  const onCloseTabConfirmChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {closeTabConfirm: selected});
      dispatch(settingsActions.setSettingsState({key: 'closeTabConfirm', value: selected}));
    },
    [dispatch],
  );

  const onTerminateAIConfirmChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {terminateAIConfirm: selected});
      dispatch(settingsActions.setSettingsState({key: 'terminateAIConfirm', value: selected}));
    },
    [dispatch],
  );

  const onSendSignalConfirmChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {exitSignalConfirm: selected});
      dispatch(settingsActions.setSettingsState({key: 'exitSignalConfirm', value: selected}));
    },
    [dispatch],
  );

  const onForceReloadConfirmChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {forceReloadConfirm: selected});
      dispatch(settingsActions.setSettingsState({key: 'forceReloadConfirm', value: selected}));
    },
    [dispatch],
  );

  return (
    <>
      <SettingsFilterItem
        searchTexts={[
          'Close App',
          'close app',
          'quit application',
          'exit app',
          'confirmation window',
          'ctrl',
          'bypass confirmation',
        ]}>
        <LynxSwitch
          title="Close App"
          enabled={closeConfirm}
          onEnabledChange={onCloseConfirmChange}
          description="Show a confirmation window when closing the app."
        />
      </SettingsFilterItem>
      <SettingsFilterItem
        searchTexts={[
          'Close Tab',
          'close tab',
          'terminal tab',
          'close running terminal',
          'confirmation window',
          'ctrl',
          'bypass confirmation',
        ]}>
        <LynxSwitch
          title="Close Tab"
          enabled={closeTabConfirm}
          onEnabledChange={onCloseTabConfirmChange}
          description="Show a confirmation window when closing tab with terminal open."
        />
      </SettingsFilterItem>
      <SettingsFilterItem
        searchTexts={[
          'Terminate Process',
          'terminate process',
          'stop ai',
          'kill process',
          'kill ai',
          'stop process',
          'confirmation window',
          'ctrl',
          'bypass confirmation',
        ]}>
        <LynxSwitch
          title="Terminate Process"
          enabled={terminateAIConfirm}
          onEnabledChange={onTerminateAIConfirmChange}
          description="Show a confirmation window when terminating running process."
        />
      </SettingsFilterItem>

      <SettingsFilterItem
        searchTexts={[
          'Send Exit Signal (Terminal)',
          'terminal',
          'exit confirmation',
          'exit signal',
          'sigint',
          'ctrl+c',
          'confirm',
          'ctrl',
          'bypass confirmation',
        ]}>
        <LynxSwitch
          enabled={exitSignalConfirm}
          title="Send Exit Signal (Terminal)"
          onEnabledChange={onSendSignalConfirmChange}
          description="Show a confirmation window when sending exit signal to process."
        />
      </SettingsFilterItem>

      <SettingsFilterItem
        searchTexts={[
          'Browser Reload Confirmation',
          'Force Reload',
          'force reload',
          'browser reload',
          'reload page',
          'unsaved changes',
          'confirmation window',
          'bypass confirmation',
        ]}>
        <LynxSwitch
          enabled={forceReloadConfirm}
          title="Browser Reload Confirmation"
          onEnabledChange={onForceReloadConfirmChange}
          description="Show a confirmation window before reloading a page that has unsaved changes."
        />
      </SettingsFilterItem>
    </>
  );
}
