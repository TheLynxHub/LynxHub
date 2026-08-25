import LynxSwitch from '@lynx/components/LynxSwitch';
import storageIpc from '@lynx_shared/ipc/storage';
import {onBreadcrumbStateChange} from '@lynx_shared/sentry/Breadcrumbs';
import {useCallback, useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle anonymous error reporting and user interaction breadcrumbs.
 * Saves settings directly to storage via IPC.
 */
export default function CollectErrors() {
  const [collectErrors, setCollectErrors] = useState<boolean>(true);
  const [addBreadcrumbs, setAddBreadcrumbs] = useState<boolean>(true);

  // Fetch initial state from storage
  useEffect(() => {
    storageIpc.get('app').then(result => {
      setCollectErrors(result.collectErrors);
      setAddBreadcrumbs(result.addBreadcrumbs);
    });
  }, []);

  const onBreadcrumbChange = useCallback((selected: boolean) => {
    storageIpc.update('app', {addBreadcrumbs: selected});
    setAddBreadcrumbs(selected);
    onBreadcrumbStateChange(selected);
  }, []);

  const onErrorChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {collectErrors: selected});
      setCollectErrors(selected);

      // If disabling error collection, turn off breadcrumbs automatically
      if (!selected && addBreadcrumbs) {
        onBreadcrumbChange(false);
      }
    },
    [addBreadcrumbs, onBreadcrumbChange],
  );

  const improveTitle = 'Help Improve LynxHub';
  const improveDesc =
    'Allow anonymous error reporting to help me identify issues and improve your experience in future updates.';

  const interactionsTitle = 'Include Interactions';
  const interactionsDesc =
    'Collect minimal UI interactions reports. This data is anonymous ' +
    'and helps to improve app and better trace what happened before an error.';

  return (
    <>
      <SettingsFilterItem
        searchTexts={[
          improveTitle,
          improveDesc,
          'anonymous error reporting',
          'error reports',
          'improve your experience',
          'collect errors',
          'telemetry',
          'sentry',
          'crash logs',
        ]}>
        <LynxSwitch
          title={improveTitle}
          enabled={collectErrors}
          description={improveDesc}
          onEnabledChange={onErrorChange}
        />
      </SettingsFilterItem>

      <SettingsFilterItem
        searchTexts={[
          interactionsTitle,
          interactionsDesc,
          'collect minimal UI interactions',
          'user interactions',
          'breadcrumbs',
          'error reports',
          'ui events',
          'trace errors',
        ]}>
        <LynxSwitch
          enabled={addBreadcrumbs}
          title={interactionsTitle}
          isDisabled={!collectErrors}
          description={interactionsDesc}
          onEnabledChange={onBreadcrumbChange}
        />
      </SettingsFilterItem>
    </>
  );
}
