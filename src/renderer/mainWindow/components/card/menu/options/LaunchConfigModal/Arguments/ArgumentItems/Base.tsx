import {Button, Separator, Surface} from '@heroui/react';
import {TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {Reorder, useDragControls} from 'framer-motion';
import {GripVertical} from 'lucide-react';
import {ReactNode, useMemo} from 'react';

import {useGetArgumentsByID} from '../../../../../../../plugins/modules';
import {getArgumentDescription} from '../../../../../../../utils/moduleArguments';
import LynxTooltip from '../../../../../../LynxTooltip';

type Props = {
  onClick?: () => void;
  name: string;
  removeArg: () => void;
  icon: ReactNode;
  children?: ReactNode;
  tooltipText?: string;
  defaultCursor?: boolean;
  extra?: ReactNode;
  id: string;
};

/**
 * Base component for argument items in the Launch Config modal.
 * Handles drag-and-drop reordering, tooltip display, and the common card layout.
 */
export default function ArgumentItemBase({
  children,
  icon,
  name,
  onClick,
  removeArg,
  defaultCursor = true,
  extra,
  id,
}: Props) {
  const cardArgument = useGetArgumentsByID(id);
  const tooltipText = useMemo(() => getArgumentDescription(name, cardArgument), [name, cardArgument]);

  const controls = useDragControls();

  return (
    <Reorder.Item
      value={name}
      dragListener={false}
      dragControls={controls}
      className="flex flex-row items-stretch size-full">
      <div
        className={
          'w-5 active:cursor-grabbing cursor-grab text-muted/70 hover:text-muted transition-all' +
          ' duration-300 flex items-center justify-center bg-surface rounded-l-3xl relative'
        }
        onPointerDown={e => controls.start(e)}>
        <GripVertical className="size-4" />
        <Separator
          orientation="vertical"
          className="absolute right-0 h-full bg-LynxWhiteSecond dark:bg-LynxRaisinBlack"
        />
      </div>
      <LynxTooltip delay={700} content={tooltipText} triggerClassName="w-full" isDisabled={!tooltipText}>
        <Surface
          key={name}
          onClick={defaultCursor ? undefined : onClick}
          className={`${!!onClick && !defaultCursor ? 'cursor-pointer' : ''} rounded-l-none px-2 py-0 rounded-r-3xl`}>
          <div className={`justify-between ${children ? 'pb-0' : 'pb-1'} pt-1 text-xs flex flex-row items-center`}>
            <div className="flex gap-x-1 text-success-hover">
              <div className="flex items-center justify-center">{icon}</div>
              <span className="font-JetBrainsMono font-semibold">{name}</span>
            </div>
            <div className="flex flex-row items-center gap-x-1">
              {extra}
              <Button
                size="sm"
                variant="ghost"
                onPress={removeArg}
                aria-label="Remove argument"
                className="text-danger-soft-foreground hover:bg-danger-soft-hover"
                isIconOnly>
                <TrashBin2Icon className="size-3.5" />
              </Button>
            </div>
          </div>

          {children && <div className="pb-2 mt-1">{children}</div>}
        </Surface>
      </LynxTooltip>
    </Reorder.Item>
  );
}
