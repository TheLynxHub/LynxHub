import LynxSwitch from '@lynx/components/LynxSwitch';
import storageIpc from '@lynx_shared/ipc/storage';
import {useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings toggle to manage launching the app in a maximized state.
 */
export default function StartMaximized() {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    storageIpc.get('app').then(app => {
      if (isMounted) setIsEnabled(app.startMaximized);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnabledChange = (enabled: boolean) => {
    storageIpc.update('app', {startMaximized: enabled});
    setIsEnabled(enabled);
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'Start Maximized',
        'startup',
        'launch maximized',
        'maximize window',
        'window size',
        'fullscreen',
        'full window',
        'maximize on open',
      ]}>
      <LynxSwitch
        enabled={isEnabled}
        title="Start Maximized"
        onEnabledChange={handleEnabledChange}
        description="Launch the app in a maximized state."
      />
    </SettingsFilterItem>
  );
}
