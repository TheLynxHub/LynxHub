import {Button, Dropdown, Label} from '@heroui/react';
import {CustomArg, CustomArgKinds} from '@lynx_common/types';
import storageIpc from '@lynx_shared/ipc/storage';
import {HomeAddIcon, InboxIcon, NotesIcon, Pen2Icon, SettingsMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {some} from 'lodash-es';
import {Plus} from 'lucide-react';
import {Dispatch, memo, SetStateAction, useEffect, useState} from 'react';

import {getTitleById} from '../../../../../../../plugins/modules';
import EmptyStateCard from '../../../../../../EmptyStateCard';
import RenderCustomItem from './RenderItem';

// Helper function to check if a name is already in the list
function isNameUnique(items: CustomArg[], newName: string): boolean {
  return !some(items, {name: newName});
}

// Helper function to generate a unique name
function generateUniqueName(items: CustomArg[], baseName: string): string {
  let counter = 1;
  let newName = baseName;

  while (!isNameUnique(items, newName)) {
    newName = `${baseName}_${counter++}`;
  }

  return newName;
}

type Props = {
  title: string;
  description: string;
  list: CustomArg[];
  setList: Dispatch<SetStateAction<CustomArg[]>>;

  addItem: (item: CustomArg) => void;
  removeItem: (item: CustomArg) => void;
  isAdded: (item: CustomArg) => boolean;
};

const CustomArgComp = memo(({title, description, list, setList, addItem, isAdded, removeItem}: Props) => {
  const shouldReduceMotion = useReducedMotion();

  const addCustom = (itemKind: CustomArgKinds) => {
    setList(prevState => {
      let baseName: string;

      switch (itemKind) {
        case 'envVar':
          baseName = 'environment';
          break;
        case 'commandLine':
          baseName = 'command';
          break;
        case 'comment':
          baseName = 'comment';
          break;
        case 'custom':
          baseName = 'custom';
          break;
        default:
          baseName = 'unknown';
          break;
      }

      const uniqueName = generateUniqueName(prevState, baseName);
      const itemToAdd: CustomArg = {
        name: uniqueName,
        type: 'Input',
        kind: itemKind,
      };

      return [...prevState, itemToAdd];
    });
  };

  const onRemove = (item: CustomArg) => {
    setList(prevState => prevState.filter(listItem => listItem.name !== item.name));
    removeItem(item);
  };

  return (
    <div className="flex flex-col relative gap-y-2">
      <div className="bg-surface-secondary rounded-xl flex flex-col inset-0 items-center p-4 relative">
        <div className="size-full flex justify-center mb-4">
          <div className="flex flex-col text-center">
            <span className="font-bold">{title}</span>
            <span className="font-semibold text-muted text-xs">{description}</span>
          </div>
          <Dropdown>
            <Button size="sm" variant="ghost" className="absolute right-3 top-3" isIconOnly>
              <Plus className="size-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item id="envVar" onPress={() => addCustom('envVar')}>
                  <HomeAddIcon />
                  <Label>Environment Variable</Label>
                </Dropdown.Item>
                <Dropdown.Item id="commandLine" onPress={() => addCustom('commandLine')}>
                  <SettingsMinimalisticIcon />
                  <Label>Command Line</Label>
                </Dropdown.Item>
                <Dropdown.Item id="custom" onPress={() => addCustom('custom')}>
                  <NotesIcon />
                  <Label>Custom</Label>
                </Dropdown.Item>
                <Dropdown.Item id="comment" onPress={() => addCustom('comment')}>
                  <Pen2Icon />
                  <Label>Comment</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <AnimatePresence mode="popLayout">
          {list.length === 0 ? (
            <motion.div
              exit={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.98,
                transition: {duration: 0.14, ease: [0.23, 1, 0.32, 1]},
              }}
              className="w-full"
              key="empty_custom_args"
              initial={{translateY: shouldReduceMotion ? 0 : 6, opacity: 0, scale: shouldReduceMotion ? 1 : 0.98}}
              animate={{translateY: 0, opacity: 1, scale: 1, transition: {duration: 0.18, ease: [0.23, 1, 0.32, 1]}}}>
              <EmptyStateCard
                description={
                  <span className="flex items-center gap-x-1 text-sm text-muted">
                    Use <Plus className="size-3" /> Button to add new item.
                  </span>
                }
                icon={<InboxIcon size={40} />}
                title="No custom argument available to display"
              />
            </motion.div>
          ) : (
            <motion.div
              className={
                `w-full grid gap-2 ` + `${list.length === 1 ? 'grid-cols-1' : 'max-2xl:grid-cols-1 2xl:grid-cols-2'}`
              }
              key="custom_args_grid"
              transition={{layout: {duration: 0.2, ease: [0.23, 1, 0.32, 1]}}}
              layout>
              {list.map(item => (
                <RenderCustomItem
                  item={item}
                  key={item.name}
                  addItem={addItem}
                  removeItem={onRemove}
                  isAdded={isAdded(item)}
                  setCustomList={setList}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

type CustomProps = {
  id: string;
  setCustomArgs: Dispatch<SetStateAction<CustomArg[]>>;
  selectedArguments: Set<string>;
  currentArgs: string[];
};

export default function CustomArguments({id, setCustomArgs, selectedArguments, currentArgs}: CustomProps) {
  const [globalList, setGlobalList] = useState<CustomArg[]>([]);
  const [perCardList, setPerCardList] = useState<CustomArg[]>([]);

  const [title, setTitle] = useState<string>();
  const [initializingLists, setInitializingLists] = useState<boolean>(true);

  useEffect(() => {
    if (!initializingLists) {
      storageIpc.get('cardsConfig').then(value => {
        storageIpc.update('cardsConfig', {customArgs: {...value.customArgs, global: globalList}});
      });
    }
  }, [globalList, id, initializingLists]);

  useEffect(() => {
    if (!initializingLists) {
      storageIpc.get('cardsConfig').then(value => {
        // Update existing card with new args
        const updatedPerCard = value.customArgs.perCard.map(card =>
          card.cardId === id ? {...card, args: perCardList} : card,
        );

        // Check if the card with the given id exists in the updated array
        const existingCard = updatedPerCard.some(card => card.cardId === id);

        // If the card does not exist, add it to the array
        if (!existingCard) {
          updatedPerCard.push({cardId: id, args: perCardList});
        }

        // Update the storage with the new perCard array
        storageIpc.update('cardsConfig', {
          customArgs: {
            ...value.customArgs,
            perCard: updatedPerCard,
          },
        });
      });
    }
  }, [perCardList, id, initializingLists]);

  useEffect(() => {
    setInitializingLists(true);

    const cardTitle = getTitleById(id);
    setTitle(cardTitle);

    storageIpc.get('cardsConfig').then(value => {
      setGlobalList(value.customArgs.global);

      const cardData = value.customArgs.perCard.find(item => item.cardId === id);
      if (cardData && cardData.args) setPerCardList(cardData.args);

      setInitializingLists(false);
    });
  }, [id]);

  const addItem = (item: CustomArg) => {
    setCustomArgs(prevState => {
      return prevState.some(value => value.name === item.name) ? prevState : [...prevState, item];
    });
  };

  const removeItem = (item: CustomArg) => {
    setCustomArgs(prevState => prevState.filter(value => value.name !== item.name));
  };

  const isAdded = (item: CustomArg) => {
    return selectedArguments.has(item.name) || currentArgs.includes(item.name);
  };

  return (
    <div className="flex flex-col relative gap-y-2">
      <CustomArgComp
        addItem={addItem}
        isAdded={isAdded}
        list={perCardList}
        removeItem={removeItem}
        setList={setPerCardList}
        title={title + ' Specified'}
        description={'Local arguments belong to this card'}
      />
      <CustomArgComp
        title="Global"
        isAdded={isAdded}
        addItem={addItem}
        list={globalList}
        removeItem={removeItem}
        setList={setGlobalList}
        description="Global arguments to access in all cards"
      />
    </div>
  );
}
