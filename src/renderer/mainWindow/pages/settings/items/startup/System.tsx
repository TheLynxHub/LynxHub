import LynxSwitch from '@lynx/components/LynxSwitch';
import storageIpc from '@lynx_shared/ipc/storage';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings toggle to manage launching the app on system startup.
 */
export default function System() {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    storageIpc.get('app').then(app => {
      if (isMounted) setIsEnabled(app.systemStartup);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnabledChange = (enabled: boolean) => {
    storageUtilsIpc.send.setSystemStartup(enabled);
    setIsEnabled(enabled);
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'Launch on System Startup',
        'system startup',
        'launch on startup',
        'auto start',
        'boot',
        'startup',
        'windows startup',
        'login startup',
        'open on login',
      ]}>
      <LynxSwitch
        enabled={isEnabled}
        title="Launch on System Startup"
        onEnabledChange={handleEnabledChange}
        description="Automatically start the app when the system boots up."
      />
    </SettingsFilterItem>
  );
}
