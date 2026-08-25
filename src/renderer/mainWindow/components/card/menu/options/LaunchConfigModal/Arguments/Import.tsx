import {Button, Chip, Modal, TextArea, useOverlayState} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import {ChosenArgumentsData} from '@lynx_common/types';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import storageIpc from '@lynx_shared/ipc/storage';
import {
  ClipboardIcon,
  ClipboardListIcon,
  ImportIcon,
  MonitorIcon,
  TrashBin2Icon,
  WindowFrameIcon,
} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {Plus} from 'lucide-react';
import {Dispatch, memo, SetStateAction, useCallback, useMemo, useState} from 'react';

import {getCardMethod, useAllCardMethods, useGetArgumentsByID} from '../../../../../../plugins/modules';
import {parseArgumentsText} from '../../../../../../utils/parseArgumentsText';
import EmptyStateCard from '../../../../../EmptyStateCard';
import TabModal from '../../../../../TabModal';

type Props = {
  importArgumentsModal: ReturnType<typeof useOverlayState>;
  chosenArguments: ChosenArgumentsData;
  setChosenArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  id: string;
};

/**
 * Modal to import and auto-parse arguments from raw text.
 */
function ImportArgumentsModal({importArgumentsModal, setChosenArguments, id}: Props) {
  const [rawText, setRawText] = useState<string>('');
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());

  const cardArgument = useGetArgumentsByID(id);
  const allMethods = useAllCardMethods();

  const parseStringToArgsMethod = useMemo(() => {
    return getCardMethod(allMethods, id, 'parseStringToArgs');
  }, [allMethods, id]);

  const parsedItems = useMemo(() => {
    return parseArgumentsText(rawText, cardArgument, parseStringToArgsMethod);
  }, [rawText, cardArgument, parseStringToArgsMethod]);

  const activeItems = useMemo(() => {
    return parsedItems.filter(item => !excludedNames.has(item.name));
  }, [parsedItems, excludedNames]);

  const moduleArgsCount = useMemo(() => activeItems.filter(item => item.isModuleArg).length, [activeItems]);
  const customArgsCount = useMemo(() => activeItems.filter(item => !item.isModuleArg).length, [activeItems]);

  const toggleExclude = useCallback((name: string) => {
    setExcludedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setExcludedNames(new Set());
      }
    } catch (e) {
      console.warn('Failed to read clipboard text:', e);
    }
  }, []);

  const handleClear = useCallback(() => {
    setRawText('');
    setExcludedNames(new Set());
  }, []);

  const onClose = useCallback(() => {
    setRawText('');
    setExcludedNames(new Set());
    importArgumentsModal.close();
  }, [importArgumentsModal]);

  const onImport = useCallback(async () => {
    if (activeItems.length === 0) return;

    // 1. Register custom arguments in cardsConfig storage
    const customItemsToAdd = activeItems.filter(item => !item.isModuleArg);
    if (customItemsToAdd.length > 0) {
      try {
        const config = await storageIpc.get('cardsConfig');
        const perCard = config.customArgs?.perCard || [];
        const cardEntry = perCard.find(c => c.cardId === id);
        const currentCardArgs = cardEntry?.args || [];

        const updatedArgs = [...currentCardArgs];
        for (const item of customItemsToAdd) {
          if (!updatedArgs.some(a => a.name === item.name)) {
            updatedArgs.push({
              id: crypto.randomUUID(),
              name: item.name,
              kind: item.customKind || 'commandLine',
              type: item.customType || 'Input',
              defaultValue: item.value,
            });
          }
        }

        const updatedPerCard = cardEntry
          ? perCard.map(c => (c.cardId === id ? {...c, args: updatedArgs} : c))
          : [...perCard, {cardId: id, args: updatedArgs}];

        await storageIpc.update('cardsConfig', {
          customArgs: {
            ...config.customArgs,
            perCard: updatedPerCard,
          },
        });
      } catch (e) {
        console.error('Failed to save custom arguments to storage:', e);
      }
    }

    // 2. Build ChosenArgument items
    const newChosenArgs: ChosenArgument[] = activeItems.map(item => {
      if (item.isModuleArg) {
        return {
          name: item.name,
          value: item.value,
        };
      }
      return {
        name: item.name,
        value: item.value,
        custom: {
          kind: item.customKind || 'commandLine',
          type: item.customType || 'Input',
        },
      };
    });

    // 3. Update chosenArguments for active preset
    setChosenArguments(prevState => {
      const activePresetData = prevState.data.find(data => data.preset === prevState.activePreset);
      if (!activePresetData) return prevState;

      const currentArgs = activePresetData.arguments;
      const updatedArgs = [...currentArgs];

      newChosenArgs.forEach(newArg => {
        const existingIndex = updatedArgs.findIndex(a => a.name === newArg.name);
        if (existingIndex !== -1) {
          updatedArgs[existingIndex] = newArg;
        } else {
          updatedArgs.push(newArg);
        }
      });

      const newData = prevState.data.map(presetData => {
        if (presetData.preset === prevState.activePreset) {
          return {
            ...presetData,
            arguments: updatedArgs,
          };
        }
        return presetData;
      });

      return {...prevState, data: newData};
    });

    topToast.success(`Successfully imported ${activeItems.length} argument${activeItems.length > 1 ? 's' : ''}.`);
    onClose();
  }, [activeItems, id, setChosenArguments, onClose]);

  return (
    <TabModal
      onOpenChange={value => {
        if (value) {
          importArgumentsModal.open();
        } else {
          onClose();
        }
      }}
      backdropVariant="transparent"
      isOpen={importArgumentsModal.isOpen}>
      <Modal.CloseTrigger />
      <Modal.Header className="flex flex-col gap-y-1">
        <div className="flex w-full flex-row items-center gap-x-2">
          <ImportIcon className="size-5 text-accent" />
          <span className="font-bold text-base">Import Arguments</span>
        </div>
        <p className="text-xs text-muted">
          Paste command-line arguments, environment variables, or script configurations to parse and import them.
        </p>
      </Modal.Header>

      <Modal.Body className="space-y-4 flex flex-col gap-y-2">
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/80">Raw Configuration Text</span>
            <div className="flex items-center gap-x-1">
              <Button size="sm" variant="ghost" onPress={handlePasteClipboard}>
                <ClipboardIcon />
                Paste
              </Button>
              {!isEmpty(rawText) && (
                <Button size="sm" variant="ghost" onPress={handleClear} className="text-danger">
                  <TrashBin2Icon />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <TextArea
            onChange={e => {
              setRawText(e.target.value);
              setExcludedNames(new Set());
            }}
            placeholder={
              'Paste text here, for example:\n' +
              '--listen --port 7860 --xformers\n' +
              'set COMMANDLINE_ARGS=--medvram --opt-sdp-attention\n' +
              'export CUDA_VISIBLE_DEVICES=0\n' +
              'PORT=8080'
            }
            rows={5}
            value={rawText}
            spellCheck="false"
            variant="secondary"
            className="font-JetBrainsMono text-xs"
            fullWidth
          />
        </div>

        {/* Parsed summary & items preview */}
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/80">Parsed Arguments ({activeItems.length})</span>
            <div className="flex items-center gap-1">
              {moduleArgsCount > 0 && (
                <Chip size="sm" variant="soft" color="success">
                  {moduleArgsCount} Module
                </Chip>
              )}
              {customArgsCount > 0 && (
                <Chip size="sm" variant="soft" color="warning">
                  {customArgsCount} Custom
                </Chip>
              )}
            </div>
          </div>

          {parsedItems.length === 0 ? (
            <EmptyStateCard
              description={
                isEmpty(rawText)
                  ? 'Paste configuration text above to see parsed arguments.'
                  : 'No arguments could be recognized from the provided text.'
              }
              variant="secondary"
              icon={<ClipboardListIcon className="size-8 text-muted/50" />}
            />
          ) : (
            <div className="rounded-2xl border border-border p-2 space-y-1.5 h-full">
              {parsedItems.map(item => {
                const isExcluded = excludedNames.has(item.name);
                return (
                  <div
                    className={
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ' +
                      (isExcluded
                        ? 'bg-surface-secondary/40 opacity-40 hover:opacity-70'
                        : 'bg-surface-secondary hover:bg-surface-secondary/80')
                    }
                    key={item.name}
                    onClick={() => toggleExclude(item.name)}>
                    <div className="flex items-center gap-x-2 truncate">
                      {item.isModuleArg ? (
                        <WindowFrameIcon className="size-4 text-success shrink-0" />
                      ) : item.customKind === 'envVar' ? (
                        <MonitorIcon className="size-4 text-warning shrink-0" />
                      ) : (
                        <MonitorIcon className="size-4 text-accent shrink-0" />
                      )}
                      <span className="font-JetBrainsMono font-semibold truncate">{item.name}</span>
                      <span className="text-muted truncate">
                        = {typeof item.value === 'boolean' ? (item.value ? 'true' : 'false') : String(item.value)}
                      </span>
                    </div>

                    <div className="flex items-center gap-x-1 shrink-0">
                      {item.isModuleArg ? (
                        <Chip size="sm" variant="soft" color="success" className="text-[10px]">
                          Module
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="soft" color="warning" className="text-[10px]">
                          {item.customKind === 'envVar' ? 'Custom Env' : 'Custom CLI'}
                        </Chip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onPress={onClose}>
          Cancel
        </Button>
        <Button onPress={onImport} isDisabled={activeItems.length === 0}>
          <Plus className="size-4" />
          Import {activeItems.length > 0 ? `(${activeItems.length})` : ''}
        </Button>
      </Modal.Footer>
    </TabModal>
  );
}

export default memo(ImportArgumentsModal);
