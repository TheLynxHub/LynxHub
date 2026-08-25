import {Card, Tooltip} from '@heroui/react';
import {ScreenShareSources} from '@lynx_common/types/shareScreen';
import {RecordIcon} from '@solar-icons/react/bold-duotone';

type SourceCardProps = {
  /** The screen or window source item to display. */
  item: ScreenShareSources;
  /** Whether this source is currently selected. */
  isSelected: boolean;
  /** Callback when the card is pressed. */
  onSelect: () => void;
  /** Whether the source is a screen (affects width styling). */
  isScreen: boolean;
};

/**
 * Component to display a single screen share source thumbnail.
 */
export function SourceCard({item, isSelected, onSelect, isScreen}: SourceCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={`p-0 animate-appearance-in ${isScreen ? 'max-w-full' : 'max-w-64'} h-fit cursor-pointer`}>
      <Card.Content>
        <img alt={item.name} src={item.thumbnail} className="object-cover aspect-video" />
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-accent/70 animate-appearance-in z-10">
            <RecordIcon className="size-7 text-white animate-appearance-in" />
          </div>
        )}
      </Card.Content>

      <Card.Footer className={'overflow-hidden px-3 pb-3 text-center h-11 flex flex-row gap-x-2 items-center'}>
        {item.icon && <img src={item.icon} alt="Source Icon" className="size-6" />}
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <p className="line-clamp-2 text-sm text-surface-foreground text-start">{item.name}</p>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom start" showArrow>
            <Tooltip.Arrow />
            <p>{item.name}</p>
          </Tooltip.Content>
        </Tooltip>
      </Card.Footer>
    </Card>
  );
}
