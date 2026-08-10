import {Button, Checkbox, Modal, Spinner} from '@heroui/react';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import {CardModules, RendererModuleImportType} from '@lynx_common/types/plugins/modules';
import {isDev} from '@lynx_common/utils';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import storageIpc from '@lynx_shared/ipc/storage';
import {DisketteIcon, SettingsMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {compact} from 'lodash-es';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import TabModal from '../../components/TabModal';
import {topToast} from '../../layouts/ToastProviders';

/** Represents a single tool card item. */
interface CardItem {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
}

/** Represents a group of tool cards categorized by their route path. */
interface CategoryCards {
  category: string;
  cards: CardItem[];
}

/** Full internal representation of a card before categorization. */
interface FullCardData {
  id: string;
  title: string;
  type: string;
  routePath: string;
}

/** Props for the ModuleConfigModal component. */
interface ModuleConfigModalProps {
  /** Controls if the configuration modal is open. */
  isOpen: boolean;
  /** Callback fired to close the modal. */
  onClose: () => void;
}

/**
 * Custom hook to fetch the FULL list of cards from the module source (not filtered runtime data),
 * handling both development and production module logic.
 */
function useModuleCardsLoader(isOpen: boolean) {
  const [disabledCards, setDisabledCards] = useState<string[]>([]);
  const [allAvailableCards, setAllAvailableCards] = useState<FullCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadFullCardList = async () => {
      setLoading(true);
      try {
        let modules: CardModules = [];

        if (isDev()) {
          try {
            const devImport = await import(/* @vite-ignore */ '@lynx_module/renderer');
            modules = devImport.default || [];
          } catch (e) {
            console.log('No dev module found, skipping...');
            modules = [];
          }
        } else {
          const pluginAddresses = await pluginsIpc.getAddresses();
          const moduleAddresses = pluginAddresses.filter(item => item.type === 'module').map(item => item.address);

          const importedModules = await Promise.all(
            moduleAddresses.map(async path => {
              try {
                const module = await import(/* @vite-ignore */ `${path}/scripts/renderer.mjs?${Date.now()}`);
                return module as RendererModuleImportType;
              } catch {
                return null;
              }
            }),
          );

          compact(importedModules).forEach(module => {
            module.default.forEach(mod => {
              const existing = modules.find(m => m.routePath === mod.routePath);
              if (existing) {
                mod.cards.forEach(card => {
                  if (!existing.cards.some(c => c.id === card.id)) {
                    existing.cards.push(card);
                  }
                });
              } else {
                modules.push(mod);
              }
            });
          });
        }

        if (!isMounted) return;

        const cards: FullCardData[] = [];
        modules.forEach(mod => {
          mod.cards.forEach(card => {
            cards.push({id: card.id, title: card.title, type: card.type || 'unknown', routePath: mod.routePath});
          });
        });

        setAllAvailableCards(cards);

        const pluginData = await storageIpc.get('plugin');
        if (isMounted) {
          setDisabledCards(pluginData?.disabledCards || []);
        }
      } catch (e) {
        console.error('Failed to load full card list:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFullCardList();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  return {loading, allAvailableCards, disabledCards, setDisabledCards};
}

/**
 * Modal component allowing users to manage loaded state of AI tool modules.
 */
export default function ModuleConfigModal({isOpen, onClose}: ModuleConfigModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [saving, setSaving] = useState(false);
  const {loading, allAvailableCards, disabledCards, setDisabledCards} = useModuleCardsLoader(isOpen);

  const categorizedCards = useMemo((): CategoryCards[] => {
    const categoryMap = new Map<string, CardItem[]>();

    allAvailableCards.forEach(card => {
      const categoryName = card.routePath.replace('_page', '').replace('Gen', ' Generation');
      const formattedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

      const cardItem: CardItem = {
        id: card.id,
        title: card.title,
        type: card.type,
        enabled: !disabledCards.includes(card.id),
      };

      if (categoryMap.has(formattedName)) {
        categoryMap.get(formattedName)!.push(cardItem);
      } else {
        categoryMap.set(formattedName, [cardItem]);
      }
    });

    return Array.from(categoryMap.entries()).map(([category, cards]) => ({category, cards}));
  }, [disabledCards, allAvailableCards]);

  const toggleCard = useCallback(
    (cardId: string) => {
      setDisabledCards(prev => {
        if (prev.includes(cardId)) {
          return prev.filter(id => id !== cardId);
        }
        return [...prev, cardId];
      });
    },
    [setDisabledCards],
  );

  const enableAll = useCallback(() => {
    setDisabledCards([]);
  }, [setDisabledCards]);

  const disableAll = useCallback(() => {
    const allIds = allAvailableCards.map(card => card.id);
    setDisabledCards(allIds);
  }, [allAvailableCards, setDisabledCards]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await storageIpc.update('plugin', {disabledCards});
      topToast.success('Module configuration saved');
      onClose();
      showRestartModal(dispatch, 'To apply the changes, please restart the app.');
    } catch (e) {
      topToast.danger('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [disabledCards, dispatch, onClose]);

  const enabledCount = useMemo(() => {
    return allAvailableCards.length - disabledCards.length;
  }, [disabledCards, allAvailableCards]);

  return (
    <TabModal size="lg" isOpen={isOpen} dialogClassName="max-w-200!">
      <Modal.CloseTrigger onPress={onClose} />
      <Modal.Header>
        <Modal.Heading className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SettingsMinimalisticIcon className="size-5" />
            <span>Module Configuration</span>
          </div>
          <span className="text-sm font-normal text-muted">
            Enable or disable individual AI tools. Disabled tools won't be loaded.
          </span>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="flex items-center justify-center py-8">Loading...</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                {enabledCount} of {allAvailableCards.length} tools enabled
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onPress={enableAll}>
                  Enable All
                </Button>
                <Button size="sm" onPress={disableAll} variant="danger-soft">
                  Disable All
                </Button>
              </div>
            </div>
            {categorizedCards.map(category => (
              <div key={category.category} className="flex flex-col gap-2 bg-surface-secondary rounded-3xl p-4">
                <span className="text-medium font-semibold">{category.category}</span>
                <div className="grid grid-cols-3 gap-2">
                  {category.cards.map(card => (
                    <Checkbox id={card.id} key={card.id} isSelected={card.enabled} onChange={() => toggleCard(card.id)}>
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        {card.title}
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button isPending={saving} onPress={handleSave}>
          {saving ? <Spinner size="sm" color="current" /> : <DisketteIcon />}
          Save & Restart
        </Button>
      </Modal.Footer>
    </TabModal>
  );
}
