import LynxSwitch from '@lynx/components/LynxSwitch';
import storageIpc from '@lynx_shared/ipc/storage';
import {useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings toggle to manage launching the app in a minimized state.
 */
export default function StartMinimized() {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    storageIpc.get('app').then(app => {
      if (isMounted) setIsEnabled(app.startMinimized);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnabledChange = (enabled: boolean) => {
    storageIpc.update('app', {startMinimized: enabled});
    setIsEnabled(enabled);
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'Start Minimized',
        'startup',
        'launch minimized',
        'minimize',
        'system tray',
        'taskbar',
        'tray start',
        'silent start',
        'background launch',
      ]}>
      <LynxSwitch
        enabled={isEnabled}
        title="Start Minimized"
        onEnabledChange={handleEnabledChange}
        description="Launch the app in a minimized state."
      />
    </SettingsFilterItem>
  );
}
