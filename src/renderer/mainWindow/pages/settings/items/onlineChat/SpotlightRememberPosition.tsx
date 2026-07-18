import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function SpotlightRememberPosition() {
  const spotlightRememberPosition = useSettingsState('spotlightRememberPosition');
  const dispatch = useDispatch<AppDispatch>();

  const onRememberPositionChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {spotlightRememberPosition: selected});
      dispatch(settingsActions.setSettingsState({key: 'spotlightRememberPosition', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Remember Position';
  const descriptionText =
    'Remember the position of the Spotlight Chat window and open it at the same location. ' +
    'If disabled, always opens centered on the active display.';

  return (
    <SettingsFilterItem
      searchTexts={[titleText, descriptionText, 'spotlight', 'chat', 'remember', 'position', 'location']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        enabled={spotlightRememberPosition}
        onEnabledChange={onRememberPositionChange}
      />
    </SettingsFilterItem>
  );
}
