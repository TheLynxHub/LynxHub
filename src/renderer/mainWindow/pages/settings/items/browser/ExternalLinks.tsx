import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Renders the toggle switch for the "Open links externally" setting.
 * When enabled, links clicked within the application will open in the user's
 * default system web browser rather than inside the app.
 */
export default function ExternalLinks() {
  const dispatch = useDispatch<AppDispatch>();
  const openLinkExternal = useSettingsState('openLinkExternal');

  const handleExternalLinkToggle = useCallback(
    (enabled: boolean) => {
      storageIpc.update('app', {openLinkExternal: enabled});
      dispatch(settingsActions.setSettingsState({key: 'openLinkExternal', value: enabled}));
    },
    [dispatch],
  );

  const filterSearchTexts = [
    'Open links externally',
    'When enabled, links will open in your system’s default browser instead of inside the app.',
    'links',
    'browser',
    'open externally',
    'default browser',
    'open links externally',
    'system browser',
    'external browser',
  ];

  return (
    <SettingsFilterItem searchTexts={filterSearchTexts}>
      <LynxSwitch
        enabled={openLinkExternal}
        title="Open links externally"
        onEnabledChange={handleExternalLinkToggle}
        description="When enabled, links will open in your system’s default browser instead of inside the app."
      />
    </SettingsFilterItem>
  );
}
