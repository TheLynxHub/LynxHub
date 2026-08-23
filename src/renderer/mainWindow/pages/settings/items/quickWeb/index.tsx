import SettingsSection from '@lynx/components/SettingsSection';
import type {QuickWebStorage} from '@lynx_common/types/storage';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {BoltIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';

import GeneralConfig from './GeneralConfig';
import UrlList from './UrlList';

export const SettingsQuickWebId = 'settings_quickweb_elem';

const DEFAULT_CONFIG: QuickWebStorage = {
  enabled: true,
  items: [],
  activeItemId: undefined,
  globalHotkey: {
    name: 'quickWeb',
    key: 'w',
    alt: true,
    control: false,
    shift: false,
    meta: false,
  },
  globalHotkeyEnabled: true,
  keepAliveOnClose: true,
  hideOnBlur: false,
  alwaysOnTop: false,
  sessionType: 'default',
};

export default function SettingsQuickWeb() {
  const [config, setConfig] = useState<QuickWebStorage>(DEFAULT_CONFIG);

  useEffect(() => {
    quickWebIpc.invoke.getConfig().then(cfg => {
      if (cfg) setConfig(cfg);
    });

    const offConfig = quickWebIpc.on.onConfigChange(cfg => {
      setConfig(cfg);
    });

    return () => {
      offConfig();
    };
  }, []);

  const handleUpdateConfig = useCallback((updates: Partial<QuickWebStorage>) => {
    quickWebIpc.send.updateConfig(updates);
    setConfig(prev => ({...prev, ...updates}));
  }, []);

  return (
    <SettingsSection
      title="Quick Web"
      id={SettingsQuickWebId}
      icon={<BoltIcon className="size-5 text-accent-foreground" />}>
      <GeneralConfig config={config} onUpdateConfig={handleUpdateConfig} />
      <UrlList config={config} onUpdateConfig={handleUpdateConfig} />
    </SettingsSection>
  );
}
