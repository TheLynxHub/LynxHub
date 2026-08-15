import {Button, Chip, Separator, Surface} from '@heroui/react';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {DangerCircleIcon, TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {Reorder, useDragControls} from 'framer-motion';
import {GripVertical} from 'lucide-react';
import {useMemo} from 'react';

import LynxTooltip from '../../../../../../LynxTooltip';

type Props = {
  /** The argument data */
  argument: ChosenArgument;
  /** Function to remove the argument */
  removeArg: () => void;
  /** Function to change the argument value */
  changeValue?: (value: any) => void;
  /** The ID of the card */
  id: string;
};

/**
 * Renders an item for an argument that is no longer supported or removed by the module.
 * Allows the user to see the deprecated/removed argument and remove it from their preset.
 */
export default function DeprecatedArgItem({argument, removeArg}: Props) {
  const controls = useDragControls();

  const tooltipText = useMemo(
    () =>
      `"${argument.name}" was removed or is no longer defined by this module.` +
      ' Remove it to avoid passing outdated arguments.',
    [argument.name],
  );

  const hasValue = argument.value !== undefined && argument.value !== null && argument.value !== '';

  return (
    <Reorder.Item
      dragListener={false}
      value={argument.name}
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
      <LynxTooltip delay={700} content={tooltipText} triggerClassName="w-full">
        <Surface key={argument.name} className="rounded-l-none px-2 py-0 rounded-r-3xl bg-warning-soft/50">
          <div className={`justify-between ${hasValue ? 'pb-0' : 'pb-1'} pt-1 text-xs flex flex-row items-center`}>
            <div className="flex items-center gap-x-1.5 text-warning-hover">
              <div className="flex items-center justify-center">
                <DangerCircleIcon className="size-4 text-warning" />
              </div>
              <span className="font-JetBrainsMono font-semibold line-through decoration-warning/60">
                {argument.name}
              </span>
              <Chip size="sm" variant="soft" color="warning" className="text-[10px] h-4 px-1.5 font-sans">
                Removed
              </Chip>
            </div>
            <div className="flex flex-row items-center gap-x-1">
              <LynxTooltip delay={400} content="Remove argument">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={removeArg}
                  aria-label="Remove argument"
                  className="text-danger-soft-foreground hover:bg-danger-soft-hover"
                  isIconOnly>
                  <TrashBin2Icon className="size-3.5" />
                </Button>
              </LynxTooltip>
            </div>
          </div>

          {hasValue && (
            <div className="pb-1.5 pt-0.5 px-0.5 text-[11px] font-JetBrainsMono text-muted flex items-center gap-x-1">
              <span className="opacity-70">Value:</span>
              <span className="font-semibold text-foreground/70 bg-surface/50 px-1 py-0.5 rounded text-[10px]">
                {String(argument.value)}
              </span>
            </div>
          )}
        </Surface>
      </LynxTooltip>
    </Reorder.Item>
  );
}
