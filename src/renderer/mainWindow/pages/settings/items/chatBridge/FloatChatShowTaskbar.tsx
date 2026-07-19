import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function FloatChatShowTaskbar() {
  const floatChatShowTaskbar = useSettingsState('floatChatShowTaskbar');
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onShowTaskbarChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {floatChatShowTaskbar: selected});
      dispatch(settingsActions.setSettingsState({key: 'floatChatShowTaskbar', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Show in Taskbar';
  const descriptionText = 'Show the Float Chat window in the system taskbar when visible.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'float', 'chat', 'taskbar', 'show']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        isDisabled={disableFloatChat}
        enabled={floatChatShowTaskbar}
        onEnabledChange={onShowTaskbarChange}
      />
    </SettingsFilterItem>
  );
}
