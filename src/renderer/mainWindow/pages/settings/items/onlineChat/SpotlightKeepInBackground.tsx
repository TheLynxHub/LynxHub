import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function SpotlightKeepInBackground() {
  const spotlightKeepInBackground = useSettingsState('spotlightKeepInBackground');
  const disableSpotlight = useSettingsState('disableSpotlight');
  const dispatch = useDispatch<AppDispatch>();

  const onKeepInBackgroundChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {spotlightKeepInBackground: selected});
      dispatch(settingsActions.setSettingsState({key: 'spotlightKeepInBackground', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Keep in Background';
  const descriptionText =
    'Keep the Spotlight window loaded in the background for instant retrieval. ' +
    'If disabled, window is closed/recreated on every hotkey press to prevent memory usage.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'spotlight',
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
        isDisabled={disableSpotlight}
        enabled={spotlightKeepInBackground}
        onEnabledChange={onKeepInBackgroundChange}
      />
    </SettingsFilterItem>
  );
}
