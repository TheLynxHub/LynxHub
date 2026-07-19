import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function DisableFloatChat() {
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onDisableChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {disableFloatChat: selected});
      dispatch(settingsActions.setSettingsState({key: 'disableFloatChat', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Disable Float Chat completely';
  const descriptionText =
    'Disable the global system hotkey, loading of window, and all related Float Chat functionality.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'float', 'chat', 'disable', 'off']}>
      <LynxSwitch
        title={titleText}
        enabled={disableFloatChat}
        description={descriptionText}
        onEnabledChange={onDisableChange}
      />
    </SettingsFilterItem>
  );
}
