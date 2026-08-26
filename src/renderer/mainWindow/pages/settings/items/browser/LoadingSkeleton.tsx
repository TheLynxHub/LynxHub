import LynxSwitch from '@lynx/components/LynxSwitch';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component to toggle the browser page loading skeleton placeholder.
 * When enabled, shows a HeroUI skeleton until the page completes its first paint.
 * When disabled, displays the browser view directly and immediately.
 */
export default function LoadingSkeletonSetting() {
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);

  useEffect(() => {
    storageIpc.get('browser').then(data => {
      setLoadingSkeleton(data?.loadingSkeleton ?? true);
    });
  }, []);

  const handleToggle = useCallback((enabled: boolean) => {
    setLoadingSkeleton(enabled);
    storageIpc.update('browser', {loadingSkeleton: enabled});
  }, []);

  const title = 'Page Loading Skeleton';
  const description =
    'Show a skeleton placeholder while web pages load before first paint, preventing a white screen flash.';

  const searchTexts = useMemo(
    () => [
      title,
      description,
      'skeleton',
      'loading skeleton',
      'placeholder',
      'page loading',
      'white screen',
      'first paint',
      'flash',
      'browser',
      'loading',
    ],
    [],
  );

  return (
    <SettingsFilterItem searchTexts={searchTexts}>
      <LynxSwitch title={title} enabled={loadingSkeleton} description={description} onEnabledChange={handleToggle} />
    </SettingsFilterItem>
  );
}
