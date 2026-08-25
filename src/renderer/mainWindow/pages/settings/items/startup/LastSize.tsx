import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings toggle to remember and restore the last window size and position.
 */
export default function LastSize() {
  const dispatch = useDispatch<AppDispatch>();
  const openLastSize = useSettingsState('openLastSize');

  const handleEnabledChange = (isEnabled: boolean) => {
    storageIpc.update('app', {openLastSize: isEnabled});
    dispatch(settingsActions.setSettingsState({key: 'openLastSize', value: isEnabled}));
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'Start in Last Window Size and Position',
        'start in last window size',
        'last position',
        'startup',
        'window size',
        'window position',
        'window geometry',
        'remember size',
        'window bounds',
      ]}>
      <LynxSwitch
        enabled={openLastSize}
        onEnabledChange={handleEnabledChange}
        title="Start in Last Window Size and Position"
        description="Start the app in the same window size and position as when it was last closed."
      />
    </SettingsFilterItem>
  );
}
