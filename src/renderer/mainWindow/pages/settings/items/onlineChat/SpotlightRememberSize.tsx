import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function SpotlightRememberSize() {
  const spotlightRememberSize = useSettingsState('spotlightRememberSize');
  const dispatch = useDispatch<AppDispatch>();

  const onRememberSizeChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {spotlightRememberSize: selected});
      dispatch(settingsActions.setSettingsState({key: 'spotlightRememberSize', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Remember Size';
  const descriptionText = 'Remember the size of the Spotlight Chat window and open it at the same size next time.';

  return (
    <SettingsFilterItem
      searchTexts={[titleText, descriptionText, 'spotlight', 'chat', 'remember', 'size', 'dimensions']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        enabled={spotlightRememberSize}
        onEnabledChange={onRememberSizeChange}
      />
    </SettingsFilterItem>
  );
}
