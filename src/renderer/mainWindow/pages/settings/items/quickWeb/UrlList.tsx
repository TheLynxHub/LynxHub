import {Button, ButtonGroup, Card, Chip, ScrollShadow, Switch, Tooltip} from '@heroui/react';
import type {QuickWebItem, QuickWebStorage} from '@lynx_common/types/storage';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {PlayIcon} from '@solar-icons/react/bold';
import {
  AddCircleIcon,
  BoltIcon,
  BookmarkIcon,
  EarthIcon,
  History2Icon,
  PenIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {AltArrowDownIcon, AltArrowUpIcon} from '@solar-icons/react/line-duotone';
import {useState} from 'react';

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
  const description = 'Manage URLs accessible in the Quick Web floating window and mark items to preload in background';

  return (
    <SettingsFilterItem searchTexts={[title, description, 'url', 'websites', 'preload', 'quick web list']}>
      <Card>
        <Card.Header className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-y-0.5">
            <Card.Title>
              <SettingsSearchHighlight text={title} />
            </Card.Title>
            <Card.Description>
              <SettingsSearchHighlight text={description} />
            </Card.Description>
          </div>

          <div className="flex items-center gap-x-1.5">
            <Tooltip delay={300}>
              <Button size="sm" variant="secondary" onPress={() => setIsBookmarksOpen(true)}>
                <BookmarkIcon className="size-4" />
                Bookmarks
              </Button>
              <Tooltip.Content>Import from Bookmarks</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={300}>
              <Button size="sm" variant="secondary" onPress={() => setIsHistoryOpen(true)}>
                <History2Icon className="size-4" />
                History
              </Button>
              <Tooltip.Content>Import from Browser History</Tooltip.Content>
            </Tooltip>

            <Button size="sm" onPress={handleOpenAdd}>
              <AddCircleIcon className="size-4" />
              Add Website
            </Button>
          </div>
        </Card.Header>

        <Card.Content>
          {items.length === 0 ? (
            <div
              className={
                'p-8 border border-dashed border-surface-tertiary rounded-xl text-center ' +
                'flex flex-col items-center gap-y-3'
              }>
              <EarthIcon className="size-10 text-muted" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">No Quick Websites Configured</span>
                <span className="text-xs text-muted">
                  Add websites or import from bookmarks to access them instantly using your global hotkey.
                </span>
              </div>
              <Button size="sm" onPress={handleOpenAdd}>
                <AddCircleIcon className="size-4" />
                Add Your First Website
              </Button>
            </div>
          ) : (
            <ScrollShadow className="max-h-96 flex flex-col gap-y-2">
              {items.map((item, idx) => (
                <div
                  className={
                    'flex items-center justify-between p-3 rounded-2xl border ' +
                    'border-border bg-surface-secondary/30 hover:bg-surface-secondary/50 transition gap-x-3'
                  }
                  key={item.id}>
                  <div className="flex items-center gap-x-3 min-w-0 flex-1">
                    {item.favIcon ? (
                      <img alt="" src={item.favIcon} className="size-5 rounded-xs shrink-0 object-contain" />
                    ) : (
                      <EarthIcon className="size-5 shrink-0 text-muted" />
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-x-2">
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                        {item.preload && (
                          <Chip size="sm" variant="soft" color="warning" className="gap-x-1 text-[10px] h-5 px-1.5">
                            <BoltIcon className="size-3 text-warning" />
                            Preload
                          </Chip>
                        )}
                      </div>
                      <span className="text-xs text-muted font-JetBrainsMono truncate">{item.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-3 shrink-0">
                    <div className="flex items-center gap-x-1.5">
                      <Tooltip delay={300}>
                        <Switch
                          isSelected={item.preload}
                          aria-label={`Preload ${item.title}`}
                          onChange={val => handleTogglePreload(item, val)}>
                          <Switch.Content>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                        <Tooltip.Content>
                          {item.preload
                            ? 'Preloaded in background on startup'
                            : 'Click to enable background preloading'}
                        </Tooltip.Content>
                      </Tooltip>
                    </div>

                    <ButtonGroup size="sm">
                      <Tooltip delay={300}>
                        <Button
                          size="sm"
                          variant="tertiary"
                          aria-label="Move Up"
                          isDisabled={idx === 0}
                          onPress={() => handleMove(idx, 'up')}
                          isIconOnly>
                          <AltArrowUpIcon className="size-4" />
                        </Button>
                        <Tooltip.Content>Move Up</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={300}>
                        <Button
                          size="sm"
                          variant="tertiary"
                          aria-label="Move Down"
                          isDisabled={idx === items.length - 1}
                          onPress={() => handleMove(idx, 'down')}
                          isIconOnly>
                          <AltArrowDownIcon className="size-4" />
                        </Button>
                        <Tooltip.Content>Move Down</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={300}>
                        <Button
                          size="sm"
                          variant="tertiary"
                          aria-label="Open in Quick Web"
                          onPress={() => handleLaunchItem(item.id)}
                          isIconOnly>
                          <PlayIcon className="size-4" />
                        </Button>
                        <Tooltip.Content>Launch in Quick Window</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={300}>
                        <Button
                          size="sm"
                          aria-label="Edit"
                          variant="tertiary"
                          onPress={() => handleOpenEdit(item)}
                          isIconOnly>
                          <PenIcon className="size-4" />
                        </Button>
                        <Tooltip.Content>Edit Website</Tooltip.Content>
                      </Tooltip>

                      <Tooltip delay={300}>
                        <Button
                          size="sm"
                          aria-label="Delete"
                          variant="danger-soft"
                          onPress={() => handleDeleteItem(item.id)}
                          isIconOnly>
                          <TrashBin2Icon className="size-4" />
                        </Button>
                        <Tooltip.Content>Delete</Tooltip.Content>
                      </Tooltip>
                    </ButtonGroup>
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
