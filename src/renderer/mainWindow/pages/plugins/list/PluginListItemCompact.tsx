import {Avatar, Button, Card, Link, Spinner, Tooltip} from '@heroui/react';
import {formatNumber} from '@lynx/utils';
import {Linux_Icon, MacOS_Icon, Windows_Icon} from '@lynx_assets/icons';
import {PluginItem} from '@lynx_common/types/plugins';
import {extractGitUrl, getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {getPluginIconUrl} from '@lynx_common/utils/plugins';
import {QuestionCircleIcon} from '@solar-icons/react/bold';
import {
  DownloadMinimalisticIcon,
  SettingsMinimalisticIcon,
  ShieldWarningIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {ArrowRightIcon, CheckReadIcon} from '@solar-icons/react/line-duotone';
import {MouseEvent} from 'react';

import {UpdateButton} from '../Elements';
import ModuleConfigModal from '../ModuleConfigModal';
import InstallProgress from './InstallProgress';

interface PluginListItemCompactProps {
  item: PluginItem;
  isSelected: boolean;
  isExtension: boolean;
  isCompatible: boolean;
  foundInstalled: any;
  foundUnloaded: any;
  linux: boolean;
  win32: boolean;
  darwin: boolean;
  currentVersion: string;
  targetUpdate: any;
  isUpgrade: boolean;
  targetVersion?: string;
  isInstalling: boolean;
  isUnInstalling: boolean;
  configModal: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
  handleUninstall: (e?: MouseEvent) => void;
  handleSelect: () => void;
}

export function PluginListItemCompact({
  item,
  isSelected,
  isExtension,
  isCompatible,
  foundInstalled,
  foundUnloaded,
  linux,
  win32,
  darwin,
  currentVersion,
  targetUpdate,
  isUpgrade,
  targetVersion,
  isInstalling,
  isUnInstalling,
  configModal,
  handleUninstall,
  handleSelect,
}: PluginListItemCompactProps) {
  return (
    <Card
      className={
        `relative border transition-all! duration-300!` +
        ` ${
          isCompatible
            ? 'border-surface/50 hover:bg-surface/70 dark:hover:bg-black/70 cursor-pointer'
            : 'border-surface/30 bg-surface/30 opacity-70'
        }` +
        ` ${isSelected && (isExtension ? 'border-accent!' : 'border-LynxPurple!')}` +
        ` px-3 py-2 min-h-14 flex flex-row items-center justify-between gap-x-2`
      }
      key={`${item.metadata.id}_plugin_compact_item`}
      onClick={isCompatible ? handleSelect : undefined}>
      {/* Left Side: Avatar, Title and Author */}
      <div className="flex items-center gap-x-2.5 overflow-hidden min-w-0 flex-1">
        <Avatar className="size-8 min-w-8 shrink-0">
          <Avatar.Image alt={item.metadata.title} src={getCacheUrl(getPluginIconUrl(item.url))} />
          <Avatar.Fallback className="text-xs">{getFallbackString(item.metadata.title)}</Avatar.Fallback>
        </Avatar>
        <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
          <div className="flex items-center gap-x-1.5">
            <Link
              onClick={e => {
                e.stopPropagation();
                window.open(item.url);
              }}
              className={`no-underline hover:underline text-sm font-semibold truncate ${
                isExtension ? 'text-accent' : 'text-LynxPurple'
              }`}>
              {item.metadata.title}
            </Link>
            {foundInstalled && <CheckReadIcon className="text-success size-3.5 shrink-0" />}
          </div>
          <div className="flex flex-row items-center gap-x-2 text-[10px] text-muted truncate">
            <span>
              By <span className="font-semibold">{extractGitUrl(item.url).owner}</span>
            </span>
            {item.downloadsCount !== undefined && (
              <span title="Total downloads" className="flex items-center gap-x-0.5 font-JetBrainsMono">
                <DownloadMinimalisticIcon className="size-3 text-muted/70" />
                <span>{formatNumber(item.downloadsCount).toLowerCase()}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Platforms, Version Info and Inline Actions */}
      {!isCompatible ? (
        <div className="flex items-center gap-x-2 shrink-0">
          <span
            className={
              'text-[10px] bg-warning/10 px-1.5 py-0.5 rounded-full border border-warning/30' +
              ' text-warning font-semibold flex items-center'
            }>
            Incompatible
          </span>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <div className="text-warning cursor-help shrink-0">
                <QuestionCircleIcon className="size-5" />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="whitespace-pre" showArrow>
              <Tooltip.Arrow />
              <p className="text-wrap max-w-64">{item.incompatibleReason}</p>
            </Tooltip.Content>
          </Tooltip>
          {foundInstalled && (
            <Button size="sm" className="size-7" variant="danger-soft" onClick={handleUninstall} isIconOnly>
              <TrashBin2Icon className="size-3.5" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-x-2 shrink-0">
          {/* OS Platform Indicators */}
          <div className="flex items-center gap-x-0.5 max-sm:hidden">
            {linux && <Linux_Icon className="size-3 text-surface-foreground/60" />}
            {win32 && <Windows_Icon className="size-3 text-surface-foreground/60" />}
            {darwin && <MacOS_Icon className="size-3 text-surface-foreground/60" />}
          </div>

          {/* Compact Version Badge */}
          {currentVersion !== 'N/A' && (
            <span
              className={
                'text-[10px] bg-surface/50 px-1.5 py-0.5 rounded border border-surface/80' +
                ' text-muted font-medium flex items-center gap-x-1'
              }>
              <span>{currentVersion}</span>
              {targetUpdate && (
                <>
                  <ArrowRightIcon className="size-2" />
                  <span className={`font-bold ${isUpgrade ? 'text-success' : 'text-warning'}`}>{targetVersion}</span>
                </>
              )}
            </span>
          )}

          {/* Warnings/Unloaded Indicators */}
          {foundUnloaded && (
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <div className="text-warning cursor-help shrink-0">
                  <ShieldWarningIcon className="size-4" />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content showArrow>
                <Tooltip.Arrow />
                <p className="text-xs">{foundUnloaded.message}</p>
              </Tooltip.Content>
            </Tooltip>
          )}

          {/* Module Config Trigger */}
          {foundInstalled && !isExtension && (
            <>
              <ModuleConfigModal isOpen={configModal.isOpen} onClose={configModal.close} />
              <Button
                onClick={e => {
                  e.stopPropagation();
                  configModal.open();
                }}
                size="sm"
                className="size-7"
                variant="secondary"
                isIconOnly>
                <SettingsMinimalisticIcon className="size-3.5" />
              </Button>
            </>
          )}

          {/* Update Action Button */}
          <div className="scale-90 origin-right">
            <UpdateButton item={item} isIconOnly />
          </div>

          {/* Spinning Actions */}
          {isInstalling && <Spinner size="sm" className="size-4 shrink-0" />}
          {isUnInstalling && <Spinner size="sm" color="warning" className="size-4 shrink-0" />}
        </div>
      )}

      <InstallProgress pluginUrl={item.url} isInstalling={isInstalling} />
    </Card>
  );
}
export default PluginListItemCompact;
