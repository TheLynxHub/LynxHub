import parseTerminalColors from '@lynx/features/session/terminal/colorHandler';
import {getRendererMode, getTheme, getWindowPty} from '@lynx/features/session/terminal/utils';
import {AppDispatch} from '@lynx/redux/store';
import {TerminalUseConpty} from '@lynx_common/types/ipc';
import applicationIpc from '@lynx_shared/ipc/application';
import ptyIpc from '@lynx_shared/ipc/pty';
import {CanvasAddon} from '@xterm/addon-canvas';
import {ClipboardAddon} from '@xterm/addon-clipboard';
import {FitAddon} from '@xterm/addon-fit';
import {LigaturesAddon} from '@xterm/addon-ligatures';
import {IProgressState, ProgressAddon} from '@xterm/addon-progress';
import {SearchAddon} from '@xterm/addon-search';
import {SerializeAddon} from '@xterm/addon-serialize';
import {Unicode11Addon} from '@xterm/addon-unicode11';
import {WebLinksAddon} from '@xterm/addon-web-links';
import {WebglAddon} from '@xterm/addon-webgl';
import {Terminal as XTerminal} from '@xterm/xterm';
import FontFaceObserver from 'fontfaceobserver';
import {isEmpty, isEqual} from 'lodash-es';
import {RefObject, useCallback, useEffect, useRef} from 'react';

import {topToast} from '../layouts/ToastProviders';
import {cardsActions} from '../redux/reducers/cards';
import {useTabsState} from '../redux/reducers/tabs';
import {triggerActions} from '../redux/reducers/triggers';
import {RunningCard} from '../types';

const FONT_FAMILY = 'JetBrainsMono';

export interface XTermAPI {
  terminal: XTerminal;
  fitAddon: FitAddon;
  clear: () => void;
  reset: () => void;
  getSelection: () => string;
  clearSelection: () => void;
  write: (data: string) => void;
  fit: () => void;
}

export interface UseXTermProps {
  id: string;
  terminalContainerRef: RefObject<HTMLDivElement | null>;
  onReady?: (api: XTermAPI) => void;
  outputColor: boolean;
  serializeAddon?: SerializeAddon;
  searchAddon?: SearchAddon;
  fontSize: number;
  scrollBack: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorInactiveStyle: 'none' | 'block' | 'underline' | 'bar' | 'outline';
  blinkCursor: boolean;
  resizeDelay: number;
  fontLoadTimeout: number;
  enablePtyWrite: boolean;
  enableResizeNotify: boolean;
  minResizeCols: number;
  minResizeRows: number;
  onProgress?: (progress: IProgressState) => void;
  darkMode: boolean;
  dispatch: AppDispatch;
  useConpty: TerminalUseConpty;
  enableLigatures: boolean;
  openLinkNewTab: boolean;
  type?: RunningCard['type'];
}

export const useXTerm = ({
  id,
  terminalContainerRef,
  onReady,
  outputColor,
  serializeAddon,
  searchAddon,
  fontSize,
  scrollBack,
  cursorStyle,
  cursorInactiveStyle,
  blinkCursor,
  resizeDelay,
  fontLoadTimeout,
  enablePtyWrite,
  enableResizeNotify,
  minResizeCols,
  minResizeRows,
  onProgress,
  darkMode,
  dispatch,
  useConpty,
  enableLigatures,
  openLinkNewTab,
  type,
}: UseXTermProps) => {
  const activeTab = useTabsState('activeTab');

  const terminal = useRef<XTerminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const apiRef = useRef<XTermAPI | null>(null);

  const canResize = useCallback(() => {
    if (!fitAddon.current) return false;
    const dims = fitAddon.current.proposeDimensions();
    if (!dims || dims.cols <= 0 || dims.rows <= 0) return false;
    if (minResizeCols === 0 && minResizeRows === 0) return true;
    return dims.cols > minResizeCols && dims.rows > minResizeRows;
  }, [minResizeCols, minResizeRows]);

  // Initialize terminal
  useEffect(() => {
    const terminalContainer = terminalContainerRef.current;
    if (!terminalContainer || terminal.current) return;

    let xTerm: XTerminal | null = null;
    let onResizeDisposable: {dispose: () => void} | null = null;
    let onDataDisposable: {dispose: () => void} | null = null;
    let rafId: number | null = null;
    let destroyed = false;

    const loadTerminal = async (fontFamily: string = 'monospace') => {
      const sysInfo = await applicationIpc.invoke.getSystemInfo();
      const windowsPty = getWindowPty(sysInfo, useConpty);
      const renderMode = getRendererMode();

      // Bail out if component unmounted while awaiting system info
      if (destroyed) return;

      xTerm = new XTerminal({
        allowProposedApi: true,
        fontFamily,
        scrollOnUserInput: true,
        scrollback: scrollBack,
        cursorBlink: blinkCursor,
        fontSize,
        cursorStyle,
        cursorInactiveStyle,
        windowsPty,
        theme: getTheme(darkMode),
      });

      terminal.current = xTerm;

      fitAddon.current = new FitAddon();
      xTerm.loadAddon(fitAddon.current);
      xTerm.loadAddon(new Unicode11Addon());
      xTerm.unicode.activeVersion = '11';
      xTerm.loadAddon(new ClipboardAddon());

      xTerm.loadAddon(
        new WebLinksAddon((event, uri) => {
          if (!openLinkNewTab && event.button !== 1 && type === 'both') {
            dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: uri}));
            dispatch(cardsActions.setRunningCardView({tabId: activeTab, view: 'browser'}));
            dispatch(triggerActions.trigger('clearBrowserFail'));
          } else {
            window.open(uri);
          }
        }),
      );

      // Load optional external addons
      if (serializeAddon) xTerm.loadAddon(serializeAddon);
      if (searchAddon) xTerm.loadAddon(searchAddon);

      xTerm.open(terminalContainer);

      // Store reference for use in requestAnimationFrame callback
      const termRef = xTerm;
      const fitRef = fitAddon.current;

      // Wait for next frame to ensure renderer is initialized before fitting
      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Guard: terminal was disposed before this frame fired
        if (destroyed || !termRef) return;

        if (renderMode === 'webgl') {
          try {
            const webglAddon = new WebglAddon();
            webglAddon.onContextLoss(() => webglAddon.dispose());
            termRef.loadAddon(webglAddon);
          } catch (e) {
            console.warn('Failed to load WebGL addon, falling back to canvas:', e);
            try {
              termRef.loadAddon(new CanvasAddon());
            } catch (canvasErr) {
              console.warn('Failed to load CanvasAddon as WebGL fallback:', canvasErr);
            }
          }
        } else {
          try {
            termRef.loadAddon(new CanvasAddon());
          } catch (e) {
            console.warn('Failed to load CanvasAddon:', e);
          }
        }

        // Load ligatures addon if enabled
        if (enableLigatures) {
          try {
            termRef.loadAddon(new LigaturesAddon());
          } catch (e) {
            console.warn('Failed to load ligatures addon:', e);
          }
        }

        // Load progress addon for ConEmu OSC 9;4 sequence support
        if (onProgress) {
          const progressAddon = new ProgressAddon();
          termRef.loadAddon(progressAddon);
          progressAddon.onChange(onProgress);
        }

        // Resize notification
        if (enableResizeNotify) {
          let prevSize: {cols: number; rows: number} | undefined;
          onResizeDisposable = termRef.onResize(size => {
            if (isEqual(prevSize, size)) return;
            ptyIpc.resize(id, size.cols, size.rows);
            prevSize = size;
          });
        }

        // Fit after renderer is ready
        try {
          if (canResize()) {
            fitRef?.fit();
          }
          if (enableResizeNotify && termRef) {
            ptyIpc.resize(id, termRef.cols, termRef.rows);
          }
        } catch (e) {
          console.warn('Failed to fit terminal:', e);
        }

        // PTY write
        if (enablePtyWrite) {
          onDataDisposable = termRef.onData(data => !isEmpty(data) && ptyIpc.write(id, data));
        }

        // Create API
        apiRef.current = {
          terminal: termRef,
          fitAddon: fitRef,
          clear: () => {
            termRef?.clear();
            ptyIpc.clear(id);
          },
          reset: () => {
            termRef?.reset();
          },
          getSelection: () => termRef?.getSelection() || '',
          clearSelection: () => termRef?.clearSelection(),
          write: (data: string) => termRef?.write(outputColor ? parseTerminalColors(data) : data),
          fit: () => {
            try {
              if (canResize()) fitRef?.fit();
            } catch (e) {
              console.warn('Failed to fit terminal:', e);
            }
          },
        };

        onReady?.(apiRef.current);
      });
    };

    const font = new FontFaceObserver(FONT_FAMILY);
    font
      .load(null, fontLoadTimeout)
      .then(() => loadTerminal(FONT_FAMILY))
      .catch(() => {
        void loadTerminal();
        topToast.warning('Terminal font failed to load. Using fallback.');
      });

    // Resize handler
    let resizeTimeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        if (!terminal.current || !fitAddon.current) return;
        if (canResize()) {
          try {
            fitAddon.current.fit();
          } catch (e) {
            console.warn('Failed to fit terminal on resize:', e);
          }
        }
      }, resizeDelay);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalContainer);

    return () => {
      destroyed = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeoutId);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      onResizeDisposable?.dispose();
      onDataDisposable?.dispose();
      terminal.current?.dispose();
      terminal.current = null;
      apiRef.current = null;
    };
  }, [id]);

  // Handle PTY data
  useEffect(() => {
    const offData = ptyIpc.onData((dataID, data) => {
      if (dataID === id) {
        apiRef.current?.write(data);
      }
    });

    return () => offData();
  }, [id]);

  // Update theme on dark mode change
  useEffect(() => {
    if (terminal.current) terminal.current.options.theme = getTheme(darkMode);
  }, [darkMode]);

  // Update font size
  useEffect(() => {
    if (terminal.current) {
      terminal.current.options.fontSize = fontSize;
      fitAddon.current?.fit();
    }
  }, [fontSize]);

  // Update scrollback
  useEffect(() => {
    if (terminal.current) terminal.current.options.scrollback = scrollBack;
  }, [scrollBack]);

  // Update cursor blink
  useEffect(() => {
    if (terminal.current) terminal.current.options.cursorBlink = blinkCursor;
  }, [blinkCursor]);

  // Update cursor style
  useEffect(() => {
    if (terminal.current) {
      terminal.current.options.cursorStyle = cursorStyle;
      terminal.current.options.cursorInactiveStyle = cursorInactiveStyle;
    }
  }, [cursorStyle, cursorInactiveStyle]);

  return apiRef;
};
