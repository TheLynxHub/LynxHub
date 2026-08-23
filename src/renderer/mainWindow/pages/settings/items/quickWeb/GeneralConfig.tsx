import {Button, Card, Chip, Kbd, Radio, RadioGroup, Surface, Switch, Tooltip} from '@heroui/react';
import LynxSwitch from '@lynx/components/LynxSwitch';
import type {LynxHotkey} from '@lynx_common/types/ipc';
import type {QuickWebStorage} from '@lynx_common/types/storage';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {PlayIcon} from '@solar-icons/react/bold';
import {EarthIcon, KeyboardIcon, RefreshIcon, ShieldCheckIcon} from '@solar-icons/react/bold-duotone';
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

const getHotkeyLabels = (hotkey?: LynxHotkey): string[] => {
  if (!hotkey) return ['Alt', 'W'];
  const labels: string[] = [];
  if (hotkey.meta) labels.push('Win');
  if (hotkey.control) labels.push('Ctrl');
  if (hotkey.alt) labels.push('Alt');
  if (hotkey.shift) labels.push('Shift');
  if (hotkey.key) labels.push(hotkey.key.toUpperCase());
  return labels.length > 0 ? labels : ['None'];
};

export default function GeneralConfig({config, onUpdateConfig}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const hotkeyLabels = useMemo(() => getHotkeyLabels(config.globalHotkey), [config.globalHotkey]);

  const isDefaultHotkey = useMemo(() => {
    const hk = config.globalHotkey;
    return hk && hk.alt && !hk.control && !hk.shift && !hk.meta && hk.key?.toLowerCase() === 'w';
  }, [config.globalHotkey]);

  const handleStartRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const {key, ctrlKey, shiftKey, altKey, metaKey} = event;
      const lowerKey = key.toLowerCase();

      if (lowerKey === 'escape') {
        setIsRecording(false);
        hiddenInputRef.current?.blur();
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
      hiddenInputRef.current?.blur();
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
  const description = 'Instant floating browser window accessible from anywhere via global shortcut';

  return (
    <SettingsFilterItem searchTexts={[title, description, 'hotkey', 'shortcut', 'float', 'session', 'unload', 'blur']}>
      <div className="flex flex-col gap-y-4">
        {/* Main Activation & Hotkey Card */}
        <Card>
          <Card.Header className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-y-0.5">
              <Card.Title>
                <SettingsSearchHighlight text={title} />
              </Card.Title>
              <Card.Description>
                <SettingsSearchHighlight text={description} />
              </Card.Description>
            </div>

            <Button size="sm" variant="secondary" onPress={() => quickWebIpc.send.toggleWindow()}>
              <PlayIcon className="size-3.5 text-accent-foreground" />
              Toggle Window
            </Button>
          </Card.Header>

          <Card.Content className="flex flex-col gap-y-3">
            {/* Global Hotkey Configuration Surface */}
            <Surface
              className={
                'p-3.5 rounded-2xl border border-border/70 flex flex-col ' +
                'sm:flex-row sm:items-center justify-between gap-3'
              }
              variant="secondary">
              <div className="flex items-center gap-x-3">
                <div
                  className={
                    'size-9 rounded-xl bg-accent/10 border border-accent/20 ' +
                    'flex items-center justify-center shrink-0'
                  }>
                  <KeyboardIcon className="size-5 text-accent-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Global OS Shortcut</span>
                  <span className="text-xs text-muted">
                    Open or toggle the floating window from anywhere across your desktop.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-x-2 shrink-0 self-end sm:self-auto">
                <input
                  type="text"
                  tabIndex={-1}
                  className="sr-only"
                  ref={hiddenInputRef}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setIsRecording(false)}
                />

                <Tooltip delay={300}>
                  <button
                    className={[
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer',
                      isRecording
                        ? 'border-accent bg-accent/15 text-accent ring-2 ring-accent/30 animate-pulse'
                        : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-secondary/60',
                    ].join(' ')}
                    type="button"
                    onClick={handleStartRecord}>
                    {isRecording ? (
                      <span className="font-medium">Press key combination... (Esc to cancel)</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          {hotkeyLabels.map(key => (
                            <Kbd
                              key={key}
                              className="text-[11px] font-JetBrainsMono font-semibold px-1.5 py-0.5 shrink-0">
                              {key}
                            </Kbd>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted ml-1">(Click to change)</span>
                      </>
                    )}
                  </button>
                  <Tooltip.Content>Click to record a new keyboard shortcut</Tooltip.Content>
                </Tooltip>

                {!isDefaultHotkey && (
                  <Tooltip delay={300}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={handleResetHotkey}
                      aria-label="Reset to Alt+W"
                      isIconOnly>
                      <RefreshIcon className="size-4" />
                    </Button>
                    <Tooltip.Content>Reset shortcut to Alt + W</Tooltip.Content>
                  </Tooltip>
                )}

                <Tooltip delay={300}>
                  <Switch
                    size="sm"
                    aria-label="Toggle Global Hotkey"
                    isSelected={config.globalHotkeyEnabled}
                    onChange={val => onUpdateConfig({globalHotkeyEnabled: val})}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                  <Tooltip.Content>
                    {config.globalHotkeyEnabled ? 'Global shortcut is active' : 'Global shortcut is disabled'}
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </Surface>
          </Card.Content>
        </Card>

        {/* Window Behavior & Session Settings */}
        <Card>
          <Card.Header>
            <div className="flex flex-col gap-y-0.5">
              <Card.Title>
                <SettingsSearchHighlight text="Window Behavior & Session Isolation" />
              </Card.Title>
              <Card.Description>
                <SettingsSearchHighlight
                  text={'Configure browser profile sharing, background persistence, ' + 'and window focus rules'}
                />
              </Card.Description>
            </div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-y-4">
            {/* Session Type Selector */}
            <div className="flex flex-col gap-y-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Browser Session & Storage Profile</span>
                <span className="text-xs text-muted">
                  Choose whether Quick Web shares logins, cookies, and cache with LynxHub's browser or runs isolated.
                </span>
              </div>

              <RadioGroup
                variant="secondary"
                value={config.sessionType || 'default'}
                onChange={val => onUpdateConfig({sessionType: val as 'default' | 'isolated'})}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  {/* Shared Session Card */}
                  <Surface
                    className={`p-3 rounded-2xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      config.sessionType !== 'isolated'
                        ? 'border-accent/50 bg-accent/5 shadow-xs'
                        : 'border-border hover:border-border-secondary'
                    }`}
                    onClick={() => onUpdateConfig({sessionType: 'default'})}
                    variant={config.sessionType === 'isolated' ? 'default' : 'secondary'}>
                    <Radio value="default" className="mt-0.5 pointer-events-none">
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
                    <div className="flex flex-col gap-y-1">
                      <div className="flex items-center gap-x-2">
                        <EarthIcon className="size-4 text-accent-foreground" />
                        <span className="text-xs font-semibold">Shared Session</span>
                        <Chip size="sm" variant="soft" color="accent" className="text-[10px] h-4 px-1.5 font-medium">
                          Recommended
                        </Chip>
                      </div>
                      <span className="text-[11px] text-muted leading-tight">
                        Shares cookies, logins, and storage with LynxHub's main browser.
                      </span>
                    </div>
                  </Surface>

                  {/* Isolated Session Card */}
                  <Surface
                    className={`p-3 rounded-2xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      config.sessionType === 'isolated'
                        ? 'border-accent/50 bg-accent/5 shadow-xs'
                        : 'border-border hover:border-border-secondary'
                    }`}
                    onClick={() => onUpdateConfig({sessionType: 'isolated'})}
                    variant={config.sessionType === 'isolated' ? 'secondary' : 'default'}>
                    <Radio value="isolated" className="mt-0.5 pointer-events-none">
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
                    <div className="flex flex-col gap-y-1">
                      <div className="flex items-center gap-x-2">
                        <ShieldCheckIcon className="size-4 text-accent-foreground" />
                        <span className="text-xs font-semibold">Isolated Session</span>
                      </div>
                      <span className="text-[11px] text-muted leading-tight">
                        Runs in a dedicated sandbox with separate cookies, cache, and logins.
                      </span>
                    </div>
                  </Surface>
                </div>
              </RadioGroup>
            </div>

            {/* Window Behavior Toggles */}
            <div className="flex flex-col gap-y-2.5 pt-1">
              <LynxSwitch
                variant="secondary"
                enabled={config.keepAliveOnClose}
                title="Keep in Background (Zero-Latency Reopen)"
                onEnabledChange={val => onUpdateConfig({keepAliveOnClose: val})}
                description="Keep webviews loaded in memory when closed so the floating window opens instantaneously."
              />

              <LynxSwitch
                variant="secondary"
                enabled={config.hideOnBlur}
                title="Hide on Focus Lost (Auto-Dismiss)"
                onEnabledChange={val => onUpdateConfig({hideOnBlur: val})}
                description="Automatically dismiss the floating window when clicking anywhere outside of it."
              />

              <LynxSwitch
                variant="secondary"
                enabled={config.alwaysOnTop}
                title="Always on Top (Pin Window)"
                onEnabledChange={val => onUpdateConfig({alwaysOnTop: val})}
                description="Keep the floating preview window pinned above all other desktop applications."
              />
            </div>
          </Card.Content>
        </Card>
      </div>
    </SettingsFilterItem>
  );
}
