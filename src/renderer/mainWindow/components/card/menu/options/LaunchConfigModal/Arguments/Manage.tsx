import {Button, Chip, useOverlayState} from '@heroui/react';
import {ArgumentsPresets, ChosenArgumentsData} from '@lynx_common/types';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {InboxIcon} from '@solar-icons/react/bold-duotone';
import {ImportIcon} from '@solar-icons/react/line-duotone';
import {AnimatePresence, Reorder} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {Plus} from 'lucide-react';
import {Dispatch, SetStateAction, useCallback} from 'react';

import EmptyStateCard from '../../../../../EmptyStateCard';
import LynxTooltip from '../../../../../LynxTooltip';
import LaunchConfigSection from '../LaunchConfigSection';
import ManageArgumentsItem from './ManageItem';

type Props = {
  addArgumentsModal: ReturnType<typeof useOverlayState>;
  importArgumentsModal: ReturnType<typeof useOverlayState>;
  chosenArguments: ArgumentsPresets;
  setChosenArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  id: string;
};

/**
 * Show selected arguments and allow reordering.
 */
export default function ManageArguments({
  addArgumentsModal,
  importArgumentsModal,
  chosenArguments,
  setChosenArguments,
  id,
}: Props) {
  const openAddArguments = useCallback(() => addArgumentsModal.open(), [addArgumentsModal]);
  const openImportArguments = useCallback(() => importArgumentsModal.open(), [importArgumentsModal]);

  const onReorder = useCallback(
    (items: string[]) => {
      const newOrder = items
        .map(name => chosenArguments.arguments.find(argument => argument.name === name))
        .filter((item): item is ChosenArgument => item !== undefined);

      if (newOrder.length === items.length) {
        setChosenArguments(prevState => {
          const data = prevState.data.map(arg => {
            if (arg.preset === prevState.activePreset) {
              return {...arg, arguments: newOrder};
            }
            return arg;
          });
          return {...prevState, data};
        });
      }
    },
    [chosenArguments.arguments, setChosenArguments],
  );

  return (
    <LaunchConfigSection
      title={
        <div className="flex flex-row items-center gap-x-1">
          <span>Arguments</span>
          {chosenArguments.arguments.length > 0 && <Chip size="sm">{chosenArguments.arguments.length}</Chip>}
        </div>
      }
      customButton={
        <div className="flex items-center gap-x-1">
          <LynxTooltip delay={500} content={'Import Arguments from Text'}>
            <Button size="sm" variant="ghost" onPress={openImportArguments} isIconOnly>
              <ImportIcon className="size-4" />
            </Button>
          </LynxTooltip>
          <LynxTooltip delay={500} content={'Add New Arguments'}>
            <Button size="sm" variant="ghost" onPress={openAddArguments} isIconOnly>
              <Plus className="size-4" />
            </Button>
          </LynxTooltip>
        </div>
      }
      description="Configurate environments and command lines">
      {isEmpty(chosenArguments.arguments) ? (
        <EmptyStateCard
          description={
            <div className="flex flex-col items-center gap-2">
              <span>No argument selected to display!</span>
              <div className="flex items-center gap-2 mt-1">
                <Button size="sm" variant="ghost" onPress={openImportArguments}>
                  <ImportIcon className="size-4" />
                  Import from Text
                </Button>
                <Button size="sm" onPress={openAddArguments}>
                  <Plus className="size-4" />
                  Add Arguments
                </Button>
              </div>
            </div>
          }
          bodyClassName="py-8"
          icon={<InboxIcon size={40} />}
        />
      ) : (
        <AnimatePresence>
          <Reorder.Group
            axis="y"
            onReorder={onReorder}
            className="flex flex-col space-y-2 overflow-hidden"
            values={chosenArguments.arguments.map(argument => argument.name)}>
            {chosenArguments.arguments.map(argument => (
              <ManageArgumentsItem
                id={id}
                argument={argument}
                setArguments={setChosenArguments}
                key={`${chosenArguments.preset}-${argument.name}`}
              />
            ))}
          </Reorder.Group>
        </AnimatePresence>
      )}
    </LaunchConfigSection>
  );
}
