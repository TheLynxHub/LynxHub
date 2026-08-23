import {Button, Card, Input, Radio, RadioGroup, Switch} from '@heroui/react';
import {formatHotkey} from '@lynx/utils';
import type {LynxHotkey} from '@lynx_common/types/ipc';
import type {QuickWebStorage} from '@lynx_common/types/storage';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {PlayIcon} from '@solar-icons/react/bold';
import {KeyboardIcon, RefreshIcon, ShieldCheckIcon} from '@solar-icons/react/bold-duotone';
import {KeyboardEvent, useCallback, useMemo, useRef, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type Props = {
  config: QuickWebStorage;
  onUpdateConfig: (updates: Partial<QuickWebStorage>) => void;
};

const isModifierKey = (key: string): boolean => {
  return ['control', 'shift', 'alt', 'meta', 'os'].includes(key.toLowerCase());
};

export default function GeneralConfig({config, onUpdateConfig}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hotkeyString = useMemo(() => {
    return formatHotkey(config.globalHotkey);
  }, [config.globalHotkey]);

  const handleStartRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const {key, ctrlKey, shiftKey, altKey, metaKey} = event;
      const lowerKey = key.toLowerCase();

      if (lowerKey === 'escape') {
        setIsRecording(false);
        inputRef.current?.blur();
        return;
      }

      if (isModifierKey(lowerKey)) {
        return;
      }

      const newHotkey: LynxHotkey = {
        name: 'quickWeb',
        key: lowerKey,
        control: ctrlKey,
        shift: shiftKey,
        alt: altKey,
        meta: metaKey,
      };

      onUpdateConfig({globalHotkey: newHotkey});
      setIsRecording(false);
      inputRef.current?.blur();
    },
    [onUpdateConfig],
  );

  const handleResetHotkey = () => {
    const defaultHotkey: LynxHotkey = {
      name: 'quickWeb',
      key: 'w',
      alt: true,
      control: false,
      shift: false,
      meta: false,
    };
    onUpdateConfig({globalHotkey: defaultHotkey});
  };

  const title = 'Quick Web Floating Window';
  const description = 'Configure the floating preview window, global OS shortcut, session isolation, and lifecycle';

  return (
    <SettingsFilterItem searchTexts={[title, description, 'hotkey', 'shortcut', 'float', 'session', 'unload', 'blur']}>
      <div className="flex flex-col gap-y-4">
        {/* Main Activation & Hotkey Card */}
        <Card>
          <Card.Header className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-y-0.5">
              <Card.Title>
                <SettingsSearchHighlight text={title} />
              </Card.Title>
              <Card.Description>
                <SettingsSearchHighlight text={description} />
              </Card.Description>
            </div>

            <div className="flex items-center gap-x-2">
              <Button size="sm" variant="secondary" onPress={() => quickWebIpc.send.toggleWindow()}>
                <PlayIcon className="size-4" />
                Toggle Floating Window
              </Button>
            </div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-y-4">
            {/* Global Hotkey Configuration */}
            <div
              className={
                'flex flex-col sm:flex-row items-start sm:items-center justify-between ' +
                'p-3 rounded-2xl border border-border bg-surface-secondary/30 gap-3'
              }>
              <div className="flex items-center gap-x-3">
                <KeyboardIcon className="size-6 text-accent-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Global OS Shortcut</span>
                  <span className="text-xs text-muted">
                    Open or toggle the floating window from anywhere, even when LynxHub is in the background.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-x-2 shrink-0">
                <div className="relative">
                  <Input
                    ref={inputRef}
                    variant="secondary"
                    onKeyDown={handleKeyDown}
                    onClick={handleStartRecord}
                    onBlur={() => setIsRecording(false)}
                    className="w-48 text-center cursor-pointer font-JetBrainsMono text-xs"
                    value={isRecording ? 'Press key combination...' : hotkeyString || 'Not Set'}
                    readOnly
                  />
                </div>

                <Button size="sm" variant="ghost" onPress={handleResetHotkey}>
                  <RefreshIcon className="size-3.5" />
                  Reset
                </Button>

                <Switch
                  aria-label="Toggle Global Hotkey"
                  isSelected={config.globalHotkeyEnabled}
                  onChange={val => onUpdateConfig({globalHotkeyEnabled: val})}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </div>

            {/* Session Type Selector */}
            <div className={'p-3 rounded-2xl border border-border bg-surface-secondary/30 flex flex-col gap-y-2'}>
              <div className="flex items-center gap-x-2">
                <ShieldCheckIcon className="size-5 text-accent-foreground" />
                <span className="text-sm font-semibold">Browser Session & Cookie Sharing</span>
              </div>
              <span className="text-xs text-muted">
                Choose whether the floating window shares login sessions and cookies with LynxHub's main browser or runs
                in an isolated profile.
              </span>

              <RadioGroup
                variant="secondary"
                value={config.sessionType || 'default'}
                onChange={val => onUpdateConfig({sessionType: val as 'default' | 'isolated'})}>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <Radio value="default">
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">Shared Session (Recommended)</span>
                        <span className="text-[11px] text-muted">Shares cookies & active logins with LynxHub</span>
                      </div>
                    </Radio.Content>
                  </Radio>

                  <Radio value="isolated">
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">Dedicated Isolated Session</span>
                        <span className="text-[11px] text-muted">Separate cookies & cache for Quick Web</span>
                      </div>
                    </Radio.Content>
                  </Radio>
                </div>
              </RadioGroup>
            </div>

            {/* Lifecycle & Window Behavior Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className={
                  'p-3 rounded-2xl border border-border bg-surface-secondary/20 flex items-center justify-between'
                }>
                <div className="flex flex-col gap-y-0.5 pr-2">
                  <span className="text-xs font-semibold">Keep in Background</span>
                  <span className="text-[11px] text-muted">
                    Keep webviews in memory when closed for zero-latency reopen.
                  </span>
                </div>
                <Switch
                  aria-label="Keep in Background"
                  isSelected={config.keepAliveOnClose}
                  onChange={val => onUpdateConfig({keepAliveOnClose: val})}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              <div
                className={
                  'p-3 rounded-2xl border border-border bg-surface-secondary/20 flex items-center justify-between'
                }>
                <div className="flex flex-col gap-y-0.5 pr-2">
                  <span className="text-xs font-semibold">Hide on Focus Lost</span>
                  <span className="text-[11px] text-muted">Automatically dismiss window when clicking outside.</span>
                </div>
                <Switch
                  isSelected={config.hideOnBlur}
                  aria-label="Hide on Focus Lost"
                  onChange={val => onUpdateConfig({hideOnBlur: val})}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              <div
                className={
                  'p-3 rounded-2xl border border-border bg-surface-secondary/30 flex items-center justify-between'
                }>
                <div className="flex flex-col gap-y-0.5 pr-2">
                  <span className="text-xs font-semibold">Always on Top</span>
                  <span className="text-[11px] text-muted">Keep floating window pinned above other desktop apps.</span>
                </div>
                <Switch
                  aria-label="Always on Top"
                  isSelected={config.alwaysOnTop}
                  onChange={val => onUpdateConfig({alwaysOnTop: val})}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </SettingsFilterItem>
  );
}
