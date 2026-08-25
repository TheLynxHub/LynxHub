import {Button, ButtonGroup, Popover} from '@heroui/react';
import storageIpc from '@lynx_shared/ipc/storage';
import {RefreshIcon} from '@solar-icons/react/bold-duotone';
import {useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

export default function ResetSettings() {
  const [isClearSettingsOpen, setIsClearSettingsOpen] = useState<boolean>(false);

  const reset = () => {
    storageIpc.clear();
    setIsClearSettingsOpen(false);
  };

  const cancel = () => {
    setIsClearSettingsOpen(false);
  };

  const buttonText = 'Reset Settings (Restart Required)';

  return (
    <SettingsFilterItem
      searchTexts={[
        buttonText,
        'Reset Settings',
        'reset settings',
        'factory reset',
        'restore defaults',
        'clear storage',
        'restart required',
        'reset & restart',
      ]}>
      <Popover isOpen={isClearSettingsOpen} onOpenChange={setIsClearSettingsOpen}>
        <Popover.Trigger>
          <Button variant="danger" fullWidth>
            <RefreshIcon />
            <SettingsSearchHighlight text={buttonText} />
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Dialog className="max-w-90">
            <Popover.Heading>
              <SettingsSearchHighlight text="Reset Settings" />
            </Popover.Heading>
            <p className="mt-1 text-sm text-muted">
              <SettingsSearchHighlight text="Are you sure you want to fully reset app settings and restart?" />
            </p>
            <ButtonGroup className="mt-3" fullWidth>
              <Button size="sm" onPress={reset} variant="danger-soft">
                <RefreshIcon />
                <SettingsSearchHighlight text="Reset & Restart" />
              </Button>
              <Button size="sm" onPress={cancel} variant="secondary">
                Cancel
              </Button>
            </ButtonGroup>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </SettingsFilterItem>
  );
}
