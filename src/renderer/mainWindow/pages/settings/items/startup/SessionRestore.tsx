import {Checkbox, Description, Key, Label, ListBox, Select} from '@heroui/react';
import {sessionActions, useSessionState} from '@lynx/redux/reducers/session';
import {AppDispatch} from '@lynx/redux/store';
import {Terminal_Icon} from '@lynx_assets/icons';
import {SessionRestoreMode, StartupBehavior} from '@lynx_common/types';
import {
  DangerCircleIcon,
  GlobalIcon,
  HistoryIcon,
  Home2Icon,
  PinIcon,
  RefreshIcon,
  RestartIcon,
  Widget2Icon,
} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings configuration for session persistence, crash recovery, and granular tab restoration.
 */
const SessionRestore = memo(() => {
  const config = useSessionState('config');
  const dispatch = useDispatch<AppDispatch>();

  const handleStartupBehaviorChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;
      const behavior = key as StartupBehavior;
      dispatch(sessionActions.updateConfig({startupBehavior: behavior}));
    },
    [dispatch],
  );

  const handleCrashModeChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;
      const mode = key as SessionRestoreMode;
      dispatch(sessionActions.updateConfig({restoreOnCrash: mode}));
    },
    [dispatch],
  );

  const handleToggle = useCallback(
    (field: keyof typeof config, value: boolean) => {
      dispatch(sessionActions.updateConfig({[field]: value}));
    },
    [dispatch],
  );

  const startupLabel = 'On Startup';
  const startupDesc = 'Choose what to display when opening LynxHub.';

  const crashLabel = 'Crash Recovery';
  const crashDesc = 'Configure how LynxHub handles restoring tabs after an unexpected shutdown or crash.';

  const checkboxContentClass =
    'flex items-center gap-x-2 text-sm text-foreground py-2 px-3 ' +
    'rounded-xl hover:bg-surface-tertiary transition-colors';

  return (
    <div className="flex flex-col gap-y-4 w-full">
      {/* Startup Behavior Selection */}
      <SettingsFilterItem
        searchTexts={[
          startupLabel,
          startupDesc,
          'restore session',
          'resume last page',
          'home page',
          'open tabs',
          'remember tabs',
        ]}>
        <Select value={config.startupBehavior} onChange={handleStartupBehaviorChange}>
          <Label>
            <SettingsSearchHighlight text={startupLabel} />
          </Label>
          <Select.Trigger>
            <Select.Value className="flex flex-row items-center gap-x-2" />
            <Select.Indicator />
          </Select.Trigger>
          <Description>{startupDesc}</Description>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="home" textValue="Open Home Page">
                <ListBox.ItemIndicator />
                <Home2Icon className="size-4 text-accent" />
                <div className="flex flex-col">
                  <Label>Open Home Page</Label>
                  <Description>Start fresh on the Home page every time LynxHub opens.</Description>
                </div>
              </ListBox.Item>

              <ListBox.Item id="last_page" textValue="Resume Last Active Page">
                <ListBox.ItemIndicator />
                <HistoryIcon className="size-4 text-LynxPurple" />
                <div className="flex flex-col">
                  <Label>Resume Last Active Page</Label>
                  <Description>Reopen the single internal page that was open when closing.</Description>
                </div>
              </ListBox.Item>

              <ListBox.Item id="restore_session" textValue="Restore Previous Session">
                <ListBox.ItemIndicator />
                <RestartIcon className="size-4 text-success" />
                <div className="flex flex-col">
                  <Label>Restore Previous Session (Remember All Tabs)</Label>
                  <Description>Automatically restore all open tabs, sessions, and workspaces on startup.</Description>
                </div>
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsFilterItem>

      {/* Crash Recovery Setting */}
      <SettingsFilterItem
        searchTexts={[crashLabel, crashDesc, 'crash recovery', 'restore on crash', 'unexpected exit', 'restore tabs']}>
        <Select value={config.restoreOnCrash} onChange={handleCrashModeChange}>
          <Label>
            <SettingsSearchHighlight text={crashLabel} />
          </Label>
          <Select.Trigger>
            <Select.Value className="flex flex-row items-center gap-x-2" />
            <Select.Indicator />
          </Select.Trigger>
          <Description>{crashDesc}</Description>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="ask" textValue="Ask to restore tabs (Recommended)">
                <ListBox.ItemIndicator />
                <RefreshIcon className="size-4 text-warning" />
                <div className="flex flex-col">
                  <Label>Ask to Restore (Recommended)</Label>
                  <Description>Display a restore banner when LynxHub starts after an unexpected exit.</Description>
                </div>
              </ListBox.Item>

              <ListBox.Item id="always" textValue="Always restore automatically">
                <ListBox.ItemIndicator />
                <RestartIcon className="size-4 text-success" />
                <div className="flex flex-col">
                  <Label>Always Restore Automatically</Label>
                  <Description>Immediately reopen all previously active tabs after a crash without asking.</Description>
                </div>
              </ListBox.Item>

              <ListBox.Item id="never" textValue="Never restore">
                <ListBox.ItemIndicator />
                <DangerCircleIcon className="size-4 text-danger" />
                <div className="flex flex-col">
                  <Label>Never Restore</Label>
                  <Description>Discard crashed session data and always start fresh.</Description>
                </div>
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </SettingsFilterItem>

      {/* Granular Restoration Filters */}
      <SettingsFilterItem
        searchTexts={[
          'Tab Types to Remember & Restore',
          'browser tabs',
          'terminal tabs',
          'ai cards',
          'workspaces',
          'pinned tabs',
          'static pages',
        ]}>
        <div className="flex flex-col gap-y-3 pt-1">
          <div className="flex flex-col gap-y-0.5">
            <Label className="text-sm font-medium text-foreground">
              <SettingsSearchHighlight text="Tab Types to Remember & Restore" />
            </Label>
            <Description className="text-xs text-foreground/60">
              Customize which types of tabs and sessions LynxHub should remember and restore.
            </Description>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Checkbox
              isSelected={config.restoreBrowserTabs}
              onChange={(isSelected: boolean) => handleToggle('restoreBrowserTabs', isSelected)}>
              <Checkbox.Content className={checkboxContentClass}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div className="flex items-center gap-x-2 min-w-0">
                  <GlobalIcon className="size-4 text-accent shrink-0" />
                  <span className="truncate">Standalone Browser Tabs</span>
                </div>
              </Checkbox.Content>
            </Checkbox>

            <Checkbox
              isSelected={config.restoreAiCardTabs}
              onChange={(isSelected: boolean) => handleToggle('restoreAiCardTabs', isSelected)}>
              <Checkbox.Content className={checkboxContentClass}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div className="flex items-center gap-x-2 min-w-0">
                  <Widget2Icon className="size-4 text-LynxPurple shrink-0" />
                  <span className="truncate">AI Cards & Workspaces</span>
                </div>
              </Checkbox.Content>
            </Checkbox>

            <Checkbox
              isSelected={config.restoreTerminalTabs}
              onChange={(isSelected: boolean) => handleToggle('restoreTerminalTabs', isSelected)}>
              <Checkbox.Content className={checkboxContentClass}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div className="flex items-center gap-x-2 min-w-0">
                  <Terminal_Icon className="size-4 text-warning shrink-0" />
                  <span className="truncate">Standalone Terminal Tabs</span>
                </div>
              </Checkbox.Content>
            </Checkbox>

            <Checkbox
              isSelected={config.restoreStaticPages}
              onChange={(isSelected: boolean) => handleToggle('restoreStaticPages', isSelected)}>
              <Checkbox.Content className={checkboxContentClass}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div className="flex items-center gap-x-2 min-w-0">
                  <Home2Icon className="size-4 text-success shrink-0" />
                  <span className="truncate">Internal App Pages</span>
                </div>
              </Checkbox.Content>
            </Checkbox>

            <div className="sm:col-span-2">
              <Checkbox
                isSelected={config.restorePinnedTabsOnly}
                onChange={(isSelected: boolean) => handleToggle('restorePinnedTabsOnly', isSelected)}>
                <Checkbox.Content className={checkboxContentClass}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <div className="flex items-center gap-x-2 min-w-0">
                    <PinIcon className="size-4 text-warning shrink-0" />
                    <span className="truncate">Only Restore Pinned Tabs on Startup</span>
                  </div>
                </Checkbox.Content>
              </Checkbox>
            </div>
          </div>
        </div>
      </SettingsFilterItem>
    </div>
  );
});

export default SessionRestore;
