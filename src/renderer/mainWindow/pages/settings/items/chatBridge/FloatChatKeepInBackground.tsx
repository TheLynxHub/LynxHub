import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function FloatChatKeepInBackground() {
  const floatChatKeepInBackground = useSettingsState('floatChatKeepInBackground');
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onKeepInBackgroundChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {floatChatKeepInBackground: selected});
      dispatch(settingsActions.setSettingsState({key: 'floatChatKeepInBackground', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Keep in Background';
  const descriptionText =
    'Keep the Float Chat window loaded in the background for instant retrieval. ' +
    'If disabled, window is closed/recreated on every hotkey press to prevent memory usage.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'float',
        'chat',
        'background',
        'keep',
        'memory',
        'recreate',
        're-create',
      ]}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        isDisabled={disableFloatChat}
        enabled={floatChatKeepInBackground}
        onEnabledChange={onKeepInBackgroundChange}
      />
    </SettingsFilterItem>
  );
}
