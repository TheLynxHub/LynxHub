import {Avatar, Button, Checkbox, Chip, cn, Description, Skeleton, Spinner} from '@heroui/react';
import {getFallbackString} from '@lynx_common/utils';
import {CheckReadIcon, DownloadMinimalisticIcon, Widget5Icon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {Dispatch, SetStateAction, useState} from 'react';

import {useAvailablePlugins, usePluginInstaller} from './usePluginManagement';

type Props = {
  requirementsSatisfied: boolean;
  isInstalling: boolean;
  setInstalling: (value: boolean) => void;
  setInstalledPlugins: Dispatch<SetStateAction<string[]>>;
  installedPlugins: string[];
};

const containerClass =
  'bg-surface/60 rounded-3xl border border-surface-secondary p-5 ' + 'h-full flex flex-col backdrop-blur-sm';

export default function PluginSelector({
  requirementsSatisfied,
  isInstalling,
  setInstalling,
  setInstalledPlugins,
  installedPlugins,
}: Props) {
  const {plugins, setPlugins, isLoading} = useAvailablePlugins();
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  const {installPlugins} = usePluginInstaller(plugins, setPlugins, setInstalledPlugins, setInstalling);

  const handleSelectionChange = (id: string) => {
    setSelectedPlugins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleInstall = () => {
    installPlugins(selectedPlugins, () => setSelectedPlugins(new Set()));
  };

  const emptyMsg = !isEmpty(installedPlugins)
    ? 'All Starter Extensions Installed!'
    : 'No Optional Extensions Available';

  const emptyDesc = !isEmpty(installedPlugins)
    ? 'Your selected extensions are already set up and ready to go.'
    : 'You can discover and install more extensions from the Marketplace later.';

  const hasSelection = !isEmpty(selectedPlugins);

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-secondary">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
            <Widget5Icon className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Starter Extensions</h2>
            <p className="text-[11px] text-muted">Enhance your workspace with optional plugins</p>
          </div>
        </div>

        <Chip variant="soft" color="default" className="text-xs font-semibold">
          {isLoading ? 'Loading...' : `${plugins.length} Available`}
        </Chip>
      </div>

      {/* Extension List Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 rounded-2xl bg-surface/50 border border-surface-secondary flex gap-3">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-3 w-4/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty(plugins) ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 px-4">
            <div className="p-2.5 rounded-full bg-success/10 text-success mb-2">
              <CheckReadIcon className="size-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">{emptyMsg}</span>
            <p className="text-xs text-muted mt-1 max-w-xs">{emptyDesc}</p>
          </div>
        ) : (
          plugins.map(ext => {
            const isSelected = selectedPlugins.has(ext.id);
            const cardClass = cn(
              'relative rounded-2xl border transition-all duration-200 overflow-hidden',
              isSelected
                ? 'bg-accent/15 border-accent/60 shadow-xs'
                : 'bg-surface/80 border-surface-secondary hover:bg-surface hover:border-surface-secondary/80',
              !requirementsSatisfied && 'opacity-60 pointer-events-none',
            );

            return (
              <div key={ext.id} className={cardClass} onClick={() => handleSelectionChange(ext.id)}>
                <Checkbox
                  variant="secondary"
                  isSelected={isSelected}
                  isDisabled={!requirementsSatisfied}
                  onChange={() => handleSelectionChange(ext.id)}
                  className="w-full p-3 flex flex-col items-stretch cursor-pointer">
                  <Checkbox.Content className="flex items-start gap-3 w-full">
                    <Avatar className="size-9 rounded-xl shrink-0">
                      <Avatar.Image src={ext.icon} alt={`${ext.name} icon`} />
                      <Avatar.Fallback className="rounded-xl font-bold text-xs">
                        {getFallbackString(ext.name)}
                      </Avatar.Fallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="font-semibold text-xs md:text-sm text-foreground truncate">{ext.name}</div>
                      {ext.description && (
                        <Description className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-tight">
                          {ext.description}
                        </Description>
                      )}
                    </div>

                    <Checkbox.Control className="absolute top-0 right-0 size-4.5 rounded-md">
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </div>
            );
          })
        )}
      </div>

      {/* Action CTA */}
      <Button
        onPress={handleInstall}
        isPending={isInstalling}
        variant={hasSelection ? 'primary' : 'secondary'}
        isDisabled={!requirementsSatisfied || !hasSelection}
        className={cn('w-full font-bold h-10 text-xs transition-all', hasSelection && 'shadow-md shadow-accent/20')}>
        {isInstalling ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" color="current" />
            <span>Installing Extensions...</span>
          </div>
        ) : !requirementsSatisfied ? (
          'Complete Requirements to Install'
        ) : !hasSelection ? (
          'Select Extensions to Install'
        ) : (
          <div className="flex items-center gap-2">
            <DownloadMinimalisticIcon className="size-4" />
            <span>Install Selected ({selectedPlugins.size})</span>
          </div>
        )}
      </Button>
    </div>
  );
}
