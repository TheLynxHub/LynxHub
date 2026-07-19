import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function FloatChatRememberPosition() {
  const floatChatRememberPosition = useSettingsState('floatChatRememberPosition');
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onRememberPositionChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {floatChatRememberPosition: selected});
      dispatch(settingsActions.setSettingsState({key: 'floatChatRememberPosition', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Remember Position';
  const descriptionText =
    'Remember the position of the Float Chat window and open it at the same location. ' +
    'If disabled, always opens centered on the active display.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'float', 'chat', 'remember', 'position', 'location']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        isDisabled={disableFloatChat}
        enabled={floatChatRememberPosition}
        onEnabledChange={onRememberPositionChange}
      />
    </SettingsFilterItem>
  );
}
