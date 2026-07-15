import {useAppState} from '@lynx/redux/reducers/app';
import {useTerminalStat} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {FitAddon} from '@xterm/addon-fit';
import {IProgressState} from '@xterm/addon-progress';
import {SearchAddon} from '@xterm/addon-search';
import {SerializeAddon} from '@xterm/addon-serialize';
import {Terminal as XTerminal} from '@xterm/xterm';
import {forwardRef, memo, useImperativeHandle, useRef} from 'react';
import {useDispatch} from 'react-redux';

import {RunningCard} from '../types';
import {useXTerm, XTermAPI} from './useXTerm';

const MIN_RESIZE_COLS = 95;
const MIN_RESIZE_ROWS = 22;

export type {XTermAPI};

export interface XTermCoreProps {
  id: string;
  type?: RunningCard['type'];
  onReady?: (api: XTermAPI) => void;
  className?: string;

  // Optional external addons
  serializeAddon?: SerializeAddon;
  searchAddon?: SearchAddon;

  // Optional settings overrides (defaults from terminal settings)
  fontSize?: number;
  scrollBack?: number;
  cursorStyle?: 'block' | 'underline' | 'bar';
  cursorInactiveStyle?: 'none' | 'block' | 'underline' | 'bar' | 'outline';
  blinkCursor?: boolean;
  resizeDelay?: number;
  fontLoadTimeout?: number;

  // Enable PTY write (for interactive terminals)
  enablePtyWrite?: boolean;

  // Enable resize IPC notifications
  enableResizeNotify?: boolean;

  // Minimum resize constraints (set to 0 to disable)
  minResizeCols?: number;
  minResizeRows?: number;

  // Terminal progress callback (ConEmu OSC 9;4 sequence)
  onProgress?: (progress: IProgressState) => void;
}

const XTermCore = memo(
  forwardRef<XTermAPI, XTermCoreProps>(
    (
      {
        id,
        type,
        onReady,
        className = '',
        serializeAddon,
        searchAddon,
        fontSize: fontSizeOverride,
        scrollBack: scrollBackOverride,
        cursorStyle: cursorStyleOverride,
        cursorInactiveStyle: cursorInactiveStyleOverride,
        blinkCursor: blinkCursorOverride,
        resizeDelay: resizeDelayOverride,
        fontLoadTimeout: fontLoadTimeoutOverride,
        enablePtyWrite = true,
        enableResizeNotify = true,
        minResizeCols = MIN_RESIZE_COLS,
        minResizeRows = MIN_RESIZE_ROWS,
        onProgress,
      },
      ref,
    ) => {
      const terminalContainerRef = useRef<HTMLDivElement | null>(null);
      const dispatch = useDispatch<AppDispatch>();
      const darkMode = useAppState('darkMode');
      const terminalSettings = useTerminalStat();

      // Use overrides or fall back to settings
      const fontSize = fontSizeOverride ?? terminalSettings.fontSize;
      const scrollBack = scrollBackOverride ?? terminalSettings.scrollBack;
      const cursorStyle = cursorStyleOverride ?? terminalSettings.cursorStyle;
      const cursorInactiveStyle = cursorInactiveStyleOverride ?? terminalSettings.cursorInactiveStyle;
      const blinkCursor = blinkCursorOverride ?? terminalSettings.blinkCursor;
      const resizeDelay = resizeDelayOverride ?? terminalSettings.resizeDelay;
      const fontLoadTimeout = fontLoadTimeoutOverride ?? terminalSettings.fontLoadTimeout ?? 3000;
      const useConpty = terminalSettings.useConpty;
      const enableLigatures = terminalSettings.enableLigatures;
      const outputColor = terminalSettings.outputColor;
      const openLinkNewTab = terminalSettings.openLinkNewTab;

      const apiRef = useXTerm({
        id,
        terminalContainerRef,
        onReady,
        outputColor,
        openLinkNewTab,
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
        type,
      });

      // Expose API via ref - only updates when apiRef is set
      useImperativeHandle(
        ref,
        () =>
          apiRef.current || {
            terminal: null as unknown as XTerminal,
            fitAddon: null as unknown as FitAddon,
            clear: () => {},
            getSelection: () => '',
            clearSelection: () => {},
            write: () => {},
            fit: () => {},
          },
        [],
      );

      return <div ref={terminalContainerRef} className={`size-full ${className}`} />;
    },
  ),
);

export default XTermCore;
