import {Avatar, Button, Checkbox, CheckboxGroup, cn, Description, Spinner} from '@heroui/react';
import {getFallbackString} from '@lynx_common/utils';
import {ArrowRightIcon} from '@solar-icons/react/bold-duotone';
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

const addon = {
  description: 'Receive updates via email',
  icon: ArrowRightIcon,
  title: 'Email Notifications',
  value: 'email',
};

export default function PluginSelector({
  requirementsSatisfied,
  isInstalling,
  setInstalling,
  setInstalledPlugins,
  installedPlugins,
}: Props) {
  const {plugins, setPlugins} = useAvailablePlugins();
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

  return (
    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-3xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Optional Extensions</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Choose which to install</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-4">
        {isEmpty(plugins) ? (
          isEmpty(installedPlugins) ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-sm">No optional extensions available.</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-sm">
                You're all set! All optional extensions are currently installed.
              </span>
            </div>
          )
        ) : (
          <div className="flex flex-col p-2 gap-y-6 overflow-hidden size-full">
            {plugins.map(ext => (
              <CheckboxGroup key={ext.name} isDisabled={!requirementsSatisfied}>
                <div className="flex flex-col gap-2">
                  <Checkbox
                    className={cn(
                      'group relative flex-col gap-4 rounded-3xl bg-surface px-5 py-4 transition-all',
                      'data-[selected=true]:bg-accent/10',
                    )}
                    key={addon.value}
                    value={addon.value}
                    variant="secondary"
                    isSelected={selectedPlugins.has(ext.id)}
                    onChange={() => handleSelectionChange(ext.id)}>
                    <Checkbox.Content className="flex flex-row items-start justify-start gap-4">
                      <Checkbox.Control className="absolute top-3 right-4 size-5 rounded-full before:rounded-full">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Avatar>
                        <Avatar.Image src={ext.icon} alt={`${ext.name} icon`} />
                        <Avatar.Fallback>{getFallbackString(ext.name)}</Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">{ext.name}</span>
                      </div>
                    </Checkbox.Content>
                    <Description className="ml-14 text-xs text-muted -mt-3">{ext.description}</Description>
                  </Checkbox>
                </div>
              </CheckboxGroup>
            ))}
          </div>
        )}
      </div>

      <Button
        onPress={handleInstall}
        isPending={isInstalling}
        isDisabled={!requirementsSatisfied || isEmpty(selectedPlugins)}
        fullWidth>
        {isInstalling ? (
          <Spinner size="sm" color="current" />
        ) : requirementsSatisfied ? (
          'Install Selected'
        ) : (
          'Complete Requirements First'
        )}
      </Button>
    </div>
  );
}
