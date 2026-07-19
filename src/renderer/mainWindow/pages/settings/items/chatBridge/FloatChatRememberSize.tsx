import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function FloatChatRememberSize() {
  const floatChatRememberSize = useSettingsState('floatChatRememberSize');
  const disableFloatChat = useSettingsState('disableFloatChat');
  const dispatch = useDispatch<AppDispatch>();

  const onRememberSizeChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {floatChatRememberSize: selected});
      dispatch(settingsActions.setSettingsState({key: 'floatChatRememberSize', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Remember Size';
  const descriptionText = 'Remember the size of the Float Chat window and open it at the same size next time.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'float', 'chat', 'remember', 'size', 'dimensions']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        isDisabled={disableFloatChat}
        enabled={floatChatRememberSize}
        onEnabledChange={onRememberSizeChange}
      />
    </SettingsFilterItem>
  );
}
