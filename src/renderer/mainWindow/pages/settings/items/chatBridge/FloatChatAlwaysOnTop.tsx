import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function FloatChatAlwaysOnTop() {
  const floatChatAlwaysOnTop = useSettingsState('floatChatAlwaysOnTop');
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onAlwaysOnTopChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {floatChatAlwaysOnTop: selected});
      dispatch(settingsActions.setSettingsState({key: 'floatChatAlwaysOnTop', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Always on Top';
  const descriptionText = 'Keep the Float Chat window float above other windows when visible.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'float', 'chat', 'always on top', 'top']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        isDisabled={disableFloatChat}
        enabled={floatChatAlwaysOnTop}
        onEnabledChange={onAlwaysOnTopChange}
      />
    </SettingsFilterItem>
  );
}
