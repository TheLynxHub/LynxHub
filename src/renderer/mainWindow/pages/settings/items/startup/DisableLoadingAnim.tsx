import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings toggle to disable loading window animations.
 * Helps improve startup performance by removing visual effects.
 */
export default function DisableLoadingAnim() {
  const dispatch = useDispatch<AppDispatch>();
  const disableLoadingAnimations = useSettingsState('disableLoadingAnimations');

  const handleEnabledChange = (isEnabled: boolean) => {
    storageIpc.update('app', {disableLoadingAnimations: isEnabled});
    dispatch(settingsActions.setSettingsState({key: 'disableLoadingAnimations', value: isEnabled}));
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'Disable Loading Window Animations',
        'disable loading animations',
        'startup',
        'loading window',
        'visual effects',
        'performance',
        'splash screen',
        'fast boot',
        'skip animations',
      ]}>
      <LynxSwitch
        enabled={disableLoadingAnimations}
        onEnabledChange={handleEnabledChange}
        title="Disable Loading Window Animations"
        description={'Disables loading windows animations to reduce visual effects and improve performance'}
      />
    </SettingsFilterItem>
  );
}
