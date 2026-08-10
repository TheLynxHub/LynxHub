import {Button, ScrollShadow, Spinner, Switch, Tabs} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import {ScreenShareSources, ScreenShareStart} from '@lynx_common/types/shareScreen';
import shareScreenIpc from '@lynx_shared/ipc/shareScreen';
import {MonitorIcon, ScreencastIcon, VolumeLoudIcon, WindowFrameIcon} from '@solar-icons/react/bold-duotone';
import isEmpty from 'lodash/isEmpty';
import {X} from 'lucide-react';
import {Key, useState} from 'react';

import {SourceCard} from './SourceCard';
import {useScreenSources} from './useScreenSources';

type TabType = 'windows' | 'screens';

/**
 * Main application component for the Share Screen window.
 * Allows users to select a window or screen to share.
 */
export default function ScreenShare() {
  const [activeTab, setActiveTab] = useState<TabType>('windows');
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);
  const [shareAudio, setShareAudio] = useState<boolean>(false);

  // Custom hook to fetch sources
  const {isLoading, screens, windows} = useScreenSources();

  const currentData: ScreenShareSources[] = activeTab === 'windows' ? windows : screens;

  const handleShare = (): void => {
    if (selectedItem) {
      const result: ScreenShareStart = {
        id: selectedItem,
        shareAudio: shareAudio,
        type: activeTab,
      };
      shareScreenIpc.startShare(result);
    }
  };

  const handleCancel = (): void => {
    shareScreenIpc.cancel();
  };

  const handleTabChange = (key: Key) => {
    setActiveTab(key as TabType);
    setSelectedItem(undefined); // Reset selection when switching tabs
  };

  const renderEmptyState = () => (
    <EmptyStateCard
      className="size-full"
      title="Nothing to share"
      icon={<MonitorIcon className="size-12" />}
      description="No {activeTab} available to capture."
    />
  );

  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="h-full w-full flex flex-col overflow-hidden dark:bg-LynxRaisinBlack">
        {/* Header */}
        <div className="border-b border-surface-tertiary px-4 py-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Select window or screen to share</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-1.5">
          <Tabs className="w-full" selectedKey={activeTab} onSelectionChange={handleTabChange}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Options">
                <Tabs.Tab id="windows" className="gap-x-1">
                  <WindowFrameIcon className="size-4" />
                  Application Window
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="screens" className="gap-x-1">
                  <MonitorIcon className="size-4" />
                  Entire Screen
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden pl-6 pr-1">
          {isLoading ? (
            <div className="flex size-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xl" />
                <span className="text-xs text-muted">Detecting available windows and screens...</span>
              </div>
            </div>
          ) : (
            <ScrollShadow className="h-full pb-4 pr-2 pt-2">
              {isEmpty(currentData) ? (
                renderEmptyState()
              ) : (
                <div className="flex flex-row flex-wrap items-center justify-center gap-4">
                  {currentData.map(item => (
                    <SourceCard
                      item={item}
                      key={item.id}
                      isScreen={activeTab === 'screens'}
                      isSelected={selectedItem === (activeTab === 'windows' ? item.id : item.displayId)}
                      onSelect={() => setSelectedItem(activeTab === 'windows' ? item.id : item.displayId)}
                    />
                  ))}
                </div>
              )}
            </ScrollShadow>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-surface">
          <div className="flex justify-between items-center gap-x-3">
            <Switch isSelected={shareAudio} onChange={setShareAudio}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb>
                    <Switch.Icon>
                      {shareAudio ? <VolumeLoudIcon className="size-3" /> : <X className="size-3" />}
                    </Switch.Icon>
                  </Switch.Thumb>
                </Switch.Control>
                Share audio
              </Switch.Content>
            </Switch>
            <div className="flex justify-between gap-x-3">
              <Button size="sm" variant="danger-soft" onPress={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onPress={handleShare} isDisabled={!selectedItem}>
                <ScreencastIcon className="size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
