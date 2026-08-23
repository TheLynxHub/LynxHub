import {Button, Card, Chip, Dropdown, Label, ScrollShadow, Switch, Tooltip} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import type {QuickWebItem, QuickWebStorage} from '@lynx_common/types/storage';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {PlayIcon} from '@solar-icons/react/bold';
import {
  AddCircleIcon,
  BoltIcon,
  BookmarkIcon,
  EarthIcon,
  History2Icon,
  ImportIcon,
  PenIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {AltArrowDownIcon, AltArrowUpIcon} from '@solar-icons/react/line-duotone';
import {useMemo, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';
import AddEditUrlModal from './AddEditUrlModal';
import ImportBookmarksModal from './ImportBookmarksModal';
import ImportHistoryModal from './ImportHistoryModal';

type Props = {
  config: QuickWebStorage;
  onUpdateConfig?: (updates: Partial<QuickWebStorage>) => void;
};

export default function UrlList({config}: Props) {
  const [editingItem, setEditingItem] = useState<QuickWebItem | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const items = config.items || [];

  const preloadedCount = useMemo(() => {
    return items.filter(i => i.preload).length;
  }, [items]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (item: QuickWebItem) => {
    setEditingItem(item);
    setIsAddEditOpen(true);
  };

  const handleSaveItem = (itemData: {title: string; url: string; preload: boolean; favIcon?: string}) => {
    if (editingItem) {
      quickWebIpc.send.updateItem(editingItem.id, itemData);
    } else {
      quickWebIpc.send.addItem(itemData);
    }
  };

  const handleDeleteItem = (id: string) => {
    quickWebIpc.send.removeItem(id);
  };

  const handleTogglePreload = (item: QuickWebItem, preload: boolean) => {
    quickWebIpc.send.updateItem(item.id, {preload});
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    quickWebIpc.send.reorderItems(updated);
  };

  const handleImportBookmarks = (imported: {title: string; url: string; favIcon?: string}[]) => {
    imported.forEach(item => {
      quickWebIpc.send.addItem({
        title: item.title,
        url: item.url,
        favIcon: item.favIcon,
        preload: false,
      });
    });
  };

  const handleImportHistory = (imported: {title: string; url: string; favIcon?: string}[]) => {
    imported.forEach(item => {
      quickWebIpc.send.addItem({
        title: item.title,
        url: item.url,
        favIcon: item.favIcon,
        preload: false,
      });
    });
  };

  const handleLaunchItem = (itemId: string) => {
    quickWebIpc.send.selectItem(itemId);
  };

  const title = 'Configured Websites & Preloading';
  const description = 'Manage URLs accessible in the Quick Web floating window and configure startup preloading';

  return (
    <SettingsFilterItem searchTexts={[title, description, 'url', 'websites', 'preload', 'quick web list']}>
      <Card>
        <Card.Header className="flex flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-2">
              <Card.Title>
                <SettingsSearchHighlight text={title} />
              </Card.Title>
              <Chip size="sm" variant="soft" color="accent" className="h-5 text-[11px] px-2 font-medium">
                {items.length} {items.length === 1 ? 'website' : 'websites'}
              </Chip>
              {preloadedCount > 0 && (
                <Chip size="sm" variant="soft" color="warning" className="h-5 text-[11px] px-2 font-medium gap-x-1">
                  <BoltIcon className="size-3 text-warning" />
                  {preloadedCount} preloaded
                </Chip>
              )}
            </div>
            <Card.Description>
              <SettingsSearchHighlight text={description} />
            </Card.Description>
          </div>

          <div className="flex items-center gap-x-2 shrink-0">
            {/* Import Dropdown */}
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary">
                  <ImportIcon className="size-4" />
                  Import
                  <AltArrowDownIcon className="size-3 text-muted ml-0.5" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu
                  onAction={key => {
                    if (key === 'bookmarks') setIsBookmarksOpen(true);
                    if (key === 'history') setIsHistoryOpen(true);
                  }}>
                  <Dropdown.Item id="bookmarks" textValue="Import from Bookmarks">
                    <div className="flex items-center gap-x-2">
                      <BookmarkIcon className="size-4 text-accent-foreground" />
                      <Label>From Bookmarks</Label>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="history" textValue="Import from History">
                    <div className="flex items-center gap-x-2">
                      <History2Icon className="size-4 text-accent-foreground" />
                      <Label>From Browser History</Label>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            <Button size="sm" variant="primary" onPress={handleOpenAdd}>
              <AddCircleIcon className="size-4" />
              Add Website
            </Button>
          </div>
        </Card.Header>

        <Card.Content>
          {items.length === 0 ? (
            <EmptyStateCard
              description={
                'Add websites or import existing bookmarks to access them ' +
                'instantaneously with your global shortcut.'
              }
              action={
                <div className="flex items-center gap-x-2 mt-2">
                  <Button size="sm" variant="secondary" onPress={() => setIsBookmarksOpen(true)}>
                    <BookmarkIcon className="size-4" />
                    Import Bookmarks
                  </Button>
                  <Button size="sm" variant="primary" onPress={handleOpenAdd}>
                    <AddCircleIcon className="size-4" />
                    Add Website
                  </Button>
                </div>
              }
              title="No Quick Websites Configured"
              icon={<EarthIcon className="size-12 text-accent-foreground/60 mb-1" />}
            />
          ) : (
            <ScrollShadow className="max-h-96 flex flex-col gap-y-2">
              {items.map((item, idx) => (
                <div
                  className={
                    'flex items-center justify-between p-3 rounded-2xl border ' +
                    'border-border bg-surface-secondary/30 hover:bg-surface-secondary/50 ' +
                    'transition-colors gap-x-3 group'
                  }
                  key={item.id}>
                  {/* Left: Reorder arrows + Favicon + Title & URL */}
                  <div className="flex items-center gap-x-3 min-w-0 flex-1">
                    {/* Compact Reorder Arrows */}
                    <div className="flex flex-col items-center justify-center shrink-0 -my-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Move up"
                        isDisabled={idx === 0}
                        onPress={() => handleMove(idx, 'up')}
                        className="h-4 w-5 min-w-0 p-0 text-muted hover:text-foreground disabled:opacity-20"
                        isIconOnly>
                        <AltArrowUpIcon className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Move down"
                        isDisabled={idx === items.length - 1}
                        onPress={() => handleMove(idx, 'down')}
                        className="h-4 w-5 min-w-0 p-0 text-muted hover:text-foreground disabled:opacity-20"
                        isIconOnly>
                        <AltArrowDownIcon className="size-3.5" />
                      </Button>
                    </div>

                    {/* Favicon Container */}
                    <div
                      className={
                        'size-8 rounded-xl bg-surface-secondary/70 flex items-center ' +
                        'justify-center shrink-0 border border-border/50'
                      }>
                      {item.favIcon ? (
                        <img alt="" src={item.favIcon} className="size-4.5 rounded-xs object-contain" />
                      ) : (
                        <EarthIcon className="size-4.5 text-muted" />
                      )}
                    </div>

                    {/* Title + URL + Status Badge */}
                    <div className="flex flex-col min-w-0 flex-1 gap-y-0.5">
                      <div className="flex items-center gap-x-2">
                        <span className="text-sm font-semibold truncate text-foreground">{item.title}</span>
                        {item.preload && (
                          <Chip
                            size="sm"
                            variant="soft"
                            color="warning"
                            className="gap-x-1 text-[10px] h-4.5 px-1.5 font-medium">
                            <BoltIcon className="size-2.5 text-warning" />
                            Preloaded
                          </Chip>
                        )}
                      </div>
                      <span className="text-xs text-muted font-JetBrainsMono truncate select-all">{item.url}</span>
                    </div>
                  </div>

                  {/* Right: Preload Switch + Launch + Edit + Delete Actions */}
                  <div className="flex items-center gap-x-2 shrink-0">
                    <div className="flex items-center gap-x-1.5 border-r border-border/60 pr-3 mr-1">
                      <Tooltip delay={200}>
                        <div className="flex items-center gap-x-1.5 cursor-pointer">
                          <Switch
                            size="sm"
                            isSelected={item.preload}
                            aria-label={`Preload ${item.title}`}
                            onChange={val => handleTogglePreload(item, val)}>
                            <Switch.Content>
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Content>
                          </Switch>
                          <span className="text-xs text-muted font-medium hidden md:inline">Preload</span>
                        </div>
                        <Tooltip.Content>
                          {item.preload
                            ? 'Webview preloaded in background on startup'
                            : 'Click to preload in background for instant opening'}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-x-1">
                      <Tooltip delay={200}>
                        <Button
                          size="sm"
                          variant="tertiary"
                          aria-label="Open in Quick Web"
                          onPress={() => handleLaunchItem(item.id)}
                          isIconOnly>
                          <PlayIcon className="size-3.5 text-accent-foreground" />
                        </Button>
                        <Tooltip.Content>Launch in Quick Window</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={200}>
                        <Button
                          size="sm"
                          aria-label="Edit"
                          variant="tertiary"
                          onPress={() => handleOpenEdit(item)}
                          isIconOnly>
                          <PenIcon className="size-3.5" />
                        </Button>
                        <Tooltip.Content>Edit Website</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={200}>
                        <Button
                          size="sm"
                          aria-label="Delete"
                          variant="danger-soft"
                          onPress={() => handleDeleteItem(item.id)}
                          isIconOnly>
                          <TrashBin2Icon className="size-3.5" />
                        </Button>
                        <Tooltip.Content>Delete</Tooltip.Content>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollShadow>
          )}
        </Card.Content>
      </Card>

      {/* Add / Edit Modal */}
      <AddEditUrlModal
        isOpen={isAddEditOpen}
        onSave={handleSaveItem}
        initialItem={editingItem}
        onClose={() => setIsAddEditOpen(false)}
      />

      {/* Bookmarks Importer */}
      <ImportBookmarksModal
        isOpen={isBookmarksOpen}
        onImport={handleImportBookmarks}
        onClose={() => setIsBookmarksOpen(false)}
      />

      {/* History Importer */}
      <ImportHistoryModal
        isOpen={isHistoryOpen}
        onImport={handleImportHistory}
        onClose={() => setIsHistoryOpen(false)}
      />
    </SettingsFilterItem>
  );
}
