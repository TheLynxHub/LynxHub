import {Button, ButtonGroup, Chip, Description, Key, Label, ListBox, Popover, Select, Spinner} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import storageIpc from '@lynx_shared/ipc/storage';
import utilsIpc from '@lynx_shared/ipc/utils';
import {BroomIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';

import DescriptionGrid from '../../../../components/DescriptionGrid';
import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

export type CacheStats = {
  entryCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  lastCleanup: number;
  lastCleanupFormatted: string;
};

export default function ImageCache() {
  const [isClearCacheOpen, setIsClearCacheOpen] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [intervalDays, setIntervalDays] = useState<string>('30');
  const [maxSize, setMaxSize] = useState<string>('536870912');

  const loadCacheStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const stats = await utilsIpc.getImageCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      topToast.danger('Failed to load cache statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load cache stats and settings on mount
  useEffect(() => {
    loadCacheStats();

    storageIpc.get('app').then(data => {
      if (data.imageCacheIntervalDays !== undefined) {
        setIntervalDays(String(data.imageCacheIntervalDays));
      }
      if (data.imageCacheMaxSize !== undefined) {
        let size = data.imageCacheMaxSize;
        if (size === 524288000) {
          size = 536870912;
          storageIpc.update('app', {imageCacheMaxSize: size});
        }
        setMaxSize(String(size));
      }
    });
  }, [loadCacheStats]);

  const handleIntervalChange = useCallback((key: Key | null) => {
    if (!key || typeof key === 'number') return;
    const value = Number(key);
    storageIpc.update('app', {imageCacheIntervalDays: value});
    setIntervalDays(String(value));
    topToast.success('Auto cleanup interval updated');
  }, []);

  const handleMaxSizeChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;
      const value = Number(key);
      storageIpc.update('app', {imageCacheMaxSize: value});
      setMaxSize(String(value));
      topToast.success('Max cache size limit updated');
      loadCacheStats(); // Reload stats to show updated max size
    },
    [loadCacheStats],
  );

  const handleClearImageCache = async () => {
    try {
      setIsClearing(true);
      const result = await utilsIpc.clearImageCache();
      if (result.success) {
        topToast.success(`Cleared ${result.clearedEntries} cached images`);
        await loadCacheStats();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      topToast.danger('Failed to clear image cache');
    } finally {
      setIsClearing(false);
      setIsClearCacheOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {isLoadingStats ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : cacheStats ? (
        <>
          <DescriptionGrid
            items={[
              {
                key: 'cached_items',
                label: <SettingsSearchHighlight text="Cached Items:" />,
                content: (
                  <Chip size="sm" color="accent" variant="soft">
                    {cacheStats.entryCount}
                  </Chip>
                ),
              },
              {
                key: 'cached_size',
                label: <SettingsSearchHighlight text="Cache Size:" />,
                content: (
                  <Chip size="sm" variant="soft" color="warning">
                    {cacheStats.totalSizeFormatted}
                  </Chip>
                ),
              },
              {
                key: 'last_cleanup',
                label: <SettingsSearchHighlight text="Last Cleanup:" />,
                content: (
                  <span className="text-xs text-muted">{new Date(cacheStats.lastCleanup).toLocaleDateString()}</span>
                ),
              },
            ]}
            columns={3}
          />

          <div className="flex flex-col gap-4 mt-2 w-full text-left">
            <SettingsFilterItem
              searchTexts={['Auto Cleanup Interval', 'cleanup', 'image cache', 'interval', 'clear frequency']}>
              <Select className="w-full" value={intervalDays} onChange={handleIntervalChange}>
                <Label>
                  <SettingsSearchHighlight text="Auto Cleanup Interval" />
                </Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description>
                  <SettingsSearchHighlight
                    text={
                      'How often the image cache is automatically cleaned. ' +
                      'Set to Never to disable automatic clearing.'
                    }
                  />
                </Description>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="7" textValue="Weekly (7 days)">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>Weekly</Label>
                        <Description>
                          <SettingsSearchHighlight text="Clear expired cache every 7 days." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="30" textValue="Monthly (30 days)">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>Monthly</Label>
                        <Description>
                          <SettingsSearchHighlight text="Clear expired cache every 30 days." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="90" textValue="Quarterly (90 days)">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>Quarterly</Label>
                        <Description>
                          <SettingsSearchHighlight text="Clear expired cache every 90 days." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="0" textValue="Never">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>Never</Label>
                        <Description>
                          <SettingsSearchHighlight text="Disable automatic periodic clearing." />
                        </Description>
                      </div>
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </SettingsFilterItem>

            <SettingsFilterItem searchTexts={['Max Cache Size Limit', 'image cache size', 'cache limit', 'max size']}>
              <Select value={maxSize} className="w-full" onChange={handleMaxSizeChange}>
                <Label>
                  <SettingsSearchHighlight text="Max Cache Size Limit" />
                </Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description>
                  <SettingsSearchHighlight text="The maximum amount of disk space allocated for cached images." />
                </Description>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="104857600" textValue="100 MB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>100 MB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Small cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="268435456" textValue="256 MB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>256 MB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Medium-low cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="536870912" textValue="512 MB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>512 MB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Standard cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="1073741824" textValue="1 GB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>1 GB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Large cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="2147483648" textValue="2 GB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>2 GB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Very large cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item id="5368709120" textValue="5 GB">
                      <ListBox.ItemIndicator />
                      <div className="flex flex-col">
                        <Label>5 GB</Label>
                        <Description>
                          <SettingsSearchHighlight text="Maximum cache size limit." />
                        </Description>
                      </div>
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </SettingsFilterItem>
          </div>

          <div className="mt-2 w-full">
            {cacheStats.entryCount === 0 || isClearing ? (
              <Button variant="danger-soft" isPending={isClearing} fullWidth isDisabled>
                {isClearing ? <Spinner size="sm" color="current" /> : <BroomIcon />}
                <SettingsSearchHighlight text="Clear Image Cache" />
              </Button>
            ) : (
              <Popover isOpen={isClearCacheOpen} onOpenChange={setIsClearCacheOpen}>
                <Popover.Trigger>
                  <Button variant="danger-soft" isPending={isClearing} fullWidth>
                    {isClearing ? <Spinner size="sm" color="current" /> : <BroomIcon />}
                    <SettingsSearchHighlight text="Clear Image Cache" />
                  </Button>
                </Popover.Trigger>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Dialog className="w-90">
                    <Popover.Heading>
                      <SettingsSearchHighlight text="Clear Image Cache" />
                    </Popover.Heading>
                    <p className="mt-1 text-sm text-muted">
                      Clear {cacheStats.entryCount} cached images ({cacheStats.totalSizeFormatted})?
                    </p>
                    <ButtonGroup className="mt-2" fullWidth>
                      <Button size="sm" variant="danger-soft" onPress={handleClearImageCache}>
                        <BroomIcon />
                        Clear
                      </Button>
                      <Button size="sm" variant="secondary" onPress={() => setIsClearCacheOpen(false)}>
                        Cancel
                      </Button>
                    </ButtonGroup>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
            )}
          </div>
        </>
      ) : (
        <span className="text-sm text-muted">
          <SettingsSearchHighlight text="Failed to load cache information" />
        </span>
      )}
    </div>
  );
}
