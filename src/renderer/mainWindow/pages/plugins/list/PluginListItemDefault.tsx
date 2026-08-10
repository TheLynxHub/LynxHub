import {Avatar, Button, Card, Chip, Description, Link, Spinner, Tooltip} from '@heroui/react';
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

interface PluginListItemDefaultProps {
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

export function PluginListItemDefault({
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
}: PluginListItemDefaultProps) {
  return (
    <Card
      className={
        `relative border transition-all! duration-300!` +
        ` ${
          isCompatible
            ? 'border-surface/50 hover:bg-surface/70 dark:hover:bg-black/70 cursor-pointer'
            : 'border-surface/30 bg-surface/30 opacity-75'
        }` +
        ` ${isSelected && (isExtension ? 'border-accent!' : 'border-LynxPurple!')}`
      }
      key={`${item.metadata.id}_plugin_list_item`}
      onClick={isCompatible ? handleSelect : undefined}>
      <Card.Header>
        <div className="inline-flex items-center gap-2">
          <Avatar>
            <Avatar.Image alt={item.metadata.title} src={getCacheUrl(getPluginIconUrl(item.url))} />
            <Avatar.Fallback>{getFallbackString(item.metadata.title)}</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col">
            <Link
              onPress={() => window.open(item.url)}
              className={`no-underline hover:underline ${isExtension ? 'text-accent' : 'text-LynxPurple'}`}>
              {item.metadata.title}
            </Link>
            <Description>
              By <span className="font-bold text-muted">{extractGitUrl(item.url).owner}</span>
            </Description>
            <div className="flex flex-wrap gap-x-1.5 items-center">
              {currentVersion !== 'N/A' && (
                <Description>
                  <span className="flex flex-row items-center justify-center gap-x-0.5 w-fit mt-0.5 tracking-tight">
                    <span>{currentVersion}</span>
                    {targetUpdate && (
                      <>
                        <ArrowRightIcon className="size-2.5" />
                        <span className={`${isUpgrade ? 'text-success' : 'text-warning'}`}>{targetVersion}</span>
                      </>
                    )}
                  </span>
                </Description>
              )}
              {foundUnloaded && (
                <Tooltip delay={300}>
                  <Tooltip.Trigger>
                    <Chip size="sm" variant="soft" color="warning" className="px-1.5">
                      <ShieldWarningIcon />
                      Unloaded
                    </Chip>
                  </Tooltip.Trigger>
                  <Tooltip.Content showArrow>
                    <Tooltip.Arrow />
                    <p>{foundUnloaded.message}</p>
                  </Tooltip.Content>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {foundInstalled && <CheckReadIcon className="text-success size-5 absolute top-3 right-3" />}
      </Card.Header>

      <Card.Content>
        <Description className="line-clamp-3 max-[63rem]:line-clamp-2">{item.metadata.description}</Description>
      </Card.Content>

      <Card.Footer className="flex flex-row max-[63rem]:flex-col items-center justify-between gap-x-2">
        <div className="flex flex-row items-center gap-x-1">
          {linux && <Linux_Icon className="size-4 text-surface-foreground/70" />}
          {win32 && <Windows_Icon className="size-4 text-surface-foreground/70" />}
          {darwin && <MacOS_Icon className="size-4 text-surface-foreground/70" />}

          {item.downloadsCount !== undefined && (
            <div
              title="Total downloads"
              className="flex flex-row items-center gap-x-0.5 text-[10px] text-muted ml-2 font-JetBrainsMono">
              <DownloadMinimalisticIcon className="size-3.5 text-muted/70" />
              <span>{formatNumber(item.downloadsCount).toLowerCase()}</span>
            </div>
          )}

          {isCompatible && foundInstalled && (
            <>
              {!isExtension && (
                <>
                  <ModuleConfigModal isOpen={configModal.isOpen} onClose={configModal.close} />
                  <Tooltip delay={500}>
                    <Tooltip.Trigger>
                      <Button size="sm" variant="secondary" className="ml-1 px-2" onPress={configModal.open} isIconOnly>
                        <SettingsMinimalisticIcon className="size-4" />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow>
                      <Tooltip.Arrow />
                      <p>Configure Tools</p>
                    </Tooltip.Content>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </div>

        {!isCompatible && (
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Chip variant="soft" color="danger" className="px-1.5 h-5 text-[10px] gap-1 cursor-help">
                <QuestionCircleIcon className="size-3.5 text-danger/80" />
                Incompatible
              </Chip>
            </Tooltip.Trigger>
            <Tooltip.Content className="whitespace-pre" showArrow>
              <Tooltip.Arrow />
              <p className="text-wrap max-w-sm">{item.incompatibleReason}</p>
            </Tooltip.Content>
          </Tooltip>
        )}

        {!isCompatible ? (
          foundInstalled && (
            <Button
              size="sm"
              isIconOnly={false}
              variant="danger-soft"
              onClick={handleUninstall}
              className="px-2.5 h-7 text-xs font-semibold flex items-center">
              <TrashBin2Icon className="size-3.5" />
              Uninstall
            </Button>
          )
        ) : (
          <>
            <UpdateButton item={item} isIconOnly />

            {isInstalling && (
              <div className="flex items-center gap-x-1">
                <Spinner size="sm" />
                <span className="text-sm">Installing...</span>
              </div>
            )}

            {isUnInstalling && (
              <div className="flex items-center gap-x-1">
                <Spinner size="sm" color="warning" />
                <span className="text-sm">Uninstalling...</span>
              </div>
            )}
          </>
        )}

        <InstallProgress pluginUrl={item.url} isInstalling={isInstalling} />
      </Card.Footer>
    </Card>
  );
}
export default PluginListItemDefault;
