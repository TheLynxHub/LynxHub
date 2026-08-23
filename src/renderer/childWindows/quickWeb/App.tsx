import {Button, ButtonGroup, Input, Spinner, Tooltip} from '@heroui/react';
import type {QuickWebNavState} from '@lynx_common/types/ipc';
import type {QuickWebStorage} from '@lynx_common/types/storage';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {
  AltArrowDownIcon,
  AltArrowLeftIcon,
  AltArrowRightIcon,
  Code2Icon,
  EarthIcon,
  PinIcon,
  RefreshIcon,
  SquareShareLineIcon,
} from '@solar-icons/react/bold-duotone';
import {CloseCircleIcon} from '@solar-icons/react/linear';
import {Minus} from 'lucide-react';
import {KeyboardEvent, useEffect, useState} from 'react';

const DEFAULT_CONFIG: QuickWebStorage = {
  enabled: true,
  items: [],
  activeItemId: undefined,
  globalHotkey: {
    name: 'quickWeb',
    key: 'w',
    alt: true,
    control: false,
    shift: false,
    meta: false,
  },
  globalHotkeyEnabled: true,
  keepAliveOnClose: true,
  hideOnBlur: false,
  alwaysOnTop: false,
  sessionType: 'default',
};

export default function QuickWebApp() {
  const [navState, setNavState] = useState<QuickWebNavState>({
    url: '',
    title: 'Quick Web',
    favIcon: '',
    isLoading: false,
    canGo: {back: false, forward: false},
    activeItemId: undefined,
    isPinned: false,
  });

  const [inputUrl, setInputUrl] = useState('');
  const [config, setConfig] = useState<QuickWebStorage>(DEFAULT_CONFIG);

  useEffect(() => {
    quickWebIpc.invoke.getConfig().then(cfg => {
      if (cfg) setConfig(cfg);
    });

    const offState = quickWebIpc.on.onStateChange(state => {
      setNavState(prev => ({...prev, ...state}));
      if (state.url) {
        setInputUrl(state.url);
      }
    });

    const offCanGo = quickWebIpc.on.onCanGo(canGo => {
      setNavState(prev => ({...prev, canGo}));
    });

    const offLoading = quickWebIpc.on.onLoading(isLoading => {
      setNavState(prev => ({...prev, isLoading}));
    });

    const offTitle = quickWebIpc.on.onTitleChange(title => {
      setNavState(prev => ({...prev, title}));
    });

    const offFavIcon = quickWebIpc.on.onFavIconChange(favIcon => {
      setNavState(prev => ({...prev, favIcon}));
    });

    const offUrl = quickWebIpc.on.onUrlChange(url => {
      setNavState(prev => ({...prev, url}));
      setInputUrl(url);
    });

    const offConfig = quickWebIpc.on.onConfigChange(cfg => {
      setConfig(cfg);
    });

    const offPinned = quickWebIpc.on.onPinnedChange(isPinned => {
      setNavState(prev => ({...prev, isPinned}));
    });

    return () => {
      offState();
      offCanGo();
      offLoading();
      offTitle();
      offFavIcon();
      offUrl();
      offConfig();
      offPinned();
    };
  }, []);

  const handleNavigate = () => {
    if (!inputUrl.trim()) return;
    quickWebIpc.send.loadUrl(inputUrl.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleOpenSwitcher = () => {
    contextMenuIpc.send.openQuickWebSwitcher({
      items: config.items,
      activeItemId: navState.activeItemId,
    });
  };

  const activeItem = config.items.find(i => i.id === navState.activeItemId);

  return (
    <div
      className={
        'size-full flex flex-col overflow-hidden bg-surface dark:bg-LynxRaisinBlack ' +
        'select-none font-sans text-foreground'
      }>
      {/* Draggable Custom Top Bar */}
      <header
        className={
          'h-11 w-full border-b border-surface-tertiary px-2 flex items-center ' +
          'justify-between gap-x-2 bg-surface/90 backdrop-blur-md shrink-0'
        }
        style={{WebkitAppRegion: 'drag'} as any}>
        {/* Left: Navigation Buttons */}
        <div style={{WebkitAppRegion: 'no-drag'} as any} className="flex items-center gap-x-1 shrink-0">
          <ButtonGroup size="sm" variant="ghost">
            <Tooltip delay={300}>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Back"
                isDisabled={!navState.canGo.back}
                onPress={() => quickWebIpc.send.goBack()}
                isIconOnly>
                <AltArrowLeftIcon className="size-4" />
              </Button>
              <Tooltip.Content>Go Back</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={300}>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Forward"
                isDisabled={!navState.canGo.forward}
                onPress={() => quickWebIpc.send.goForward()}
                isIconOnly>
                <AltArrowRightIcon className="size-4" />
              </Button>
              <Tooltip.Content>Go Forward</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={300}>
              <Button
                size="sm"
                variant="ghost"
                aria-label={navState.isLoading ? 'Stop' : 'Reload'}
                onPress={() => (navState.isLoading ? quickWebIpc.send.stop() : quickWebIpc.send.reload())}
                isIconOnly>
                {navState.isLoading ? <Spinner size="sm" color="current" /> : <RefreshIcon className="size-4" />}
              </Button>
              <Tooltip.Content>{navState.isLoading ? 'Stop Loading' : 'Reload Page'}</Tooltip.Content>
            </Tooltip>
          </ButtonGroup>
        </div>

        {/* Center: Quick Switcher & URL Bar */}
        <div
          style={{WebkitAppRegion: 'no-drag'} as any}
          className="flex-1 max-w-xl flex items-center gap-x-1.5 min-w-0">
          {/* Quick Switcher Button (triggers always-on-top contextMenu overlay) */}
          <Tooltip delay={300}>
            <Button
              size="sm"
              variant="secondary"
              onPress={handleOpenSwitcher}
              aria-label="Quick Websites Switcher"
              className="gap-x-1 max-w-36 sm:max-w-48 truncate shrink-0">
              {activeItem?.favIcon || navState.favIcon ? (
                <img
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  alt=""
                  src={activeItem?.favIcon || navState.favIcon}
                  className="size-3.5 rounded-xs shrink-0 object-contain"
                />
              ) : (
                <EarthIcon className="size-3.5 shrink-0 text-accent-foreground" />
              )}
              <span className="truncate text-xs font-medium">{activeItem?.title || navState.title || 'Sites'}</span>
              <AltArrowDownIcon className="size-3 shrink-0 text-muted" />
            </Button>
            <Tooltip.Content>Switch Quick Website</Tooltip.Content>
          </Tooltip>

          {/* URL Input Bar */}
          <div className="flex-1 min-w-0">
            <Input
              value={inputUrl}
              onKeyDown={handleKeyDown}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="Search or enter web address..."
              className="w-full text-xs font-JetBrainsMono"
            />
          </div>
        </div>

        {/* Right: Window & Tool Actions */}
        <div style={{WebkitAppRegion: 'no-drag'} as any} className="flex items-center gap-x-1 shrink-0">
          <Tooltip delay={300}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Open in LynxHub tab"
              onPress={() => quickWebIpc.send.openInMainTab()}
              isIconOnly>
              <EarthIcon className="size-4 text-accent-foreground" />
            </Button>
            <Tooltip.Content>Open in LynxHub Tab</Tooltip.Content>
          </Tooltip>

          <Tooltip delay={300}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Open in external browser"
              onPress={() => quickWebIpc.send.openExternal()}
              isIconOnly>
              <SquareShareLineIcon className="size-4" />
            </Button>
            <Tooltip.Content>Open in External Browser</Tooltip.Content>
          </Tooltip>

          <Tooltip delay={300}>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Toggle DevTools"
              onPress={() => quickWebIpc.send.toggleDevTools()}
              isIconOnly>
              <Code2Icon className="size-4" />
            </Button>
            <Tooltip.Content>Toggle DevTools</Tooltip.Content>
          </Tooltip>

          <Tooltip delay={300}>
            <Button
              size="sm"
              variant={navState.isPinned ? 'secondary' : 'ghost'}
              aria-label={navState.isPinned ? 'Unpin window' : 'Always on top'}
              onPress={() => quickWebIpc.send.setAlwaysOnTop(!navState.isPinned)}
              isIconOnly>
              <PinIcon className={`size-4 ${navState.isPinned ? 'text-warning' : ''}`} />
            </Button>
            <Tooltip.Content>{navState.isPinned ? 'Pinned (Always on top)' : 'Pin window on top'}</Tooltip.Content>
          </Tooltip>

          <div className="h-4 w-px bg-surface-tertiary mx-0.5" />

          <Button
            size="sm"
            variant="ghost"
            aria-label="Minimize"
            onPress={() => quickWebIpc.send.minimizeWindow()}
            isIconOnly>
            <Minus className="size-3.5" />
          </Button>

          <Button
            size="sm"
            aria-label="Close"
            variant="danger-soft"
            onPress={() => quickWebIpc.send.closeWindow()}
            isIconOnly>
            <CloseCircleIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* The WebContentsView is rendered natively by Electron underneath this header at y=44 */}
    </div>
  );
}
