import {DownloadItemInfo} from '@lynx_common/types/downloadManager';
import {ContextMenuVolumeData, NavHistory} from '@lynx_common/types/ipc';
import {ContextMenuParams} from 'electron';
import {ReactNode} from 'react';

import {MenuTypes} from './consts';

export type ZoomLayout = {id: string; factor: number};

export type RightClick = {
  id: number;
  contextMenuParams: ContextMenuParams | undefined;
  navigationHistory: NavHistory;
};

export type RightClickParams = {
  hasLinkItems: boolean;
  hasImageItems: boolean;
  hasTextSelection: boolean;
  hasEditItems: boolean;
  isActionsAvailable: boolean;
};

export type PromptWindow = {message: string; defaultValue?: string};
export type AlertWindow = {message: string};
export type ConfirmWindow = {message: string};

export type ContextState = {
  activeLayout: MenuTypes | undefined;
  targetID: string;
  selectedText: string;

  browserScale: ZoomLayout;
  browserVolume: ContextMenuVolumeData;
  promptWindow: PromptWindow;

  rightClick: RightClick;
  rightClickParams: RightClickParams;
  alertWindow: AlertWindow;
  confirmWindow: ConfirmWindow;
  downloads: DownloadItemInfo[];
};

export type NavBtnProps = {icon?: ReactNode; onPress?: () => void; className?: string; isDisabled?: boolean};
