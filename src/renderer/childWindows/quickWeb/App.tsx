import {Button, Input, Spinner} from '@heroui/react';
import type {QuickWebNavState} from '@lynx_common/types/ipc';
import type {QuickWebStorage} from '@lynx_common/types/storage';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {
  AltArrowDownIcon,
  Code2Icon,
  EarthIcon,
  PinIcon,
  RefreshIcon,
  SquareTopDownIcon,
} from '@solar-icons/react/bold-duotone';
import {ArrowLeftIcon, ArrowRightIcon} from '@solar-icons/react/line-duotone';
import {X} from 'lucide-react';
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
          <Button
            size="sm"
            variant="ghost"
            aria-label="Back"
            isDisabled={!navState.canGo.back}
            onPress={() => quickWebIpc.send.goBack()}
            isIconOnly>
            <ArrowLeftIcon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label="Forward"
            isDisabled={!navState.canGo.forward}
            onPress={() => quickWebIpc.send.goForward()}
            isIconOnly>
            <ArrowRightIcon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label={navState.isLoading ? 'Stop' : 'Reload'}
            onPress={() => (navState.isLoading ? quickWebIpc.send.stop() : quickWebIpc.send.reload())}
            isIconOnly>
            {navState.isLoading ? <Spinner size="sm" color="current" /> : <RefreshIcon className="size-4" />}
          </Button>
        </div>

        {/* Center: Quick Switcher & URL Bar */}
        <div
          style={{WebkitAppRegion: 'no-drag'} as any}
          className="flex-1 max-w-xl flex items-center gap-x-1.5 min-w-0">
          {/* Quick Switcher Button (triggers always-on-top contextMenu overlay) */}
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

          {/* URL Input Bar */}
          <div className="flex-1 min-w-0">
            <Input
              value={inputUrl}
              className="w-full"
              variant="secondary"
              onKeyDown={handleKeyDown}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="Search or enter web address..."
            />
          </div>
        </div>

        {/* Right: Window & Tool Actions */}
        <div style={{WebkitAppRegion: 'no-drag'} as any} className="flex items-center gap-x-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Open in LynxHub tab"
            onPress={() => quickWebIpc.send.openInMainTab()}
            isIconOnly>
            <EarthIcon className="size-4 text-accent-foreground" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label="Open in external browser"
            onPress={() => quickWebIpc.send.openExternal()}
            isIconOnly>
            <SquareTopDownIcon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label="Toggle DevTools"
            onPress={() => quickWebIpc.send.toggleDevTools()}
            isIconOnly>
            <Code2Icon className="size-4" />
          </Button>

          <Button
            size="sm"
            variant={navState.isPinned ? 'secondary' : 'ghost'}
            aria-label={navState.isPinned ? 'Unpin window' : 'Always on top'}
            onPress={() => quickWebIpc.send.setAlwaysOnTop(!navState.isPinned)}
            isIconOnly>
            <PinIcon className={`size-4 ${navState.isPinned ? 'text-warning' : ''}`} />
          </Button>

          <div className="h-4 w-px bg-surface-tertiary mx-0.5" />

          <Button
            size="sm"
            variant="ghost"
            aria-label="Minimize"
            onPress={() => quickWebIpc.send.minimizeWindow()}
            isIconOnly>
            <Minus className="size-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label="Close"
            className="hover:bg-danger-soft-hover"
            onPress={() => quickWebIpc.send.closeWindow()}
            isIconOnly>
            <X className="size-4 text-danger" />
          </Button>
        </div>
      </header>

      {/* The WebContentsView is rendered natively by Electron underneath this header at y=44 */}
    </div>
  );
}
