import {Button, Label, Slider} from '@heroui/react';
import {VolumeCrossIcon, VolumeIcon, VolumeLoudIcon} from '@solar-icons/react/bold-duotone';
import {memo, useMemo} from 'react';

import {useVolume} from './useVolume';

/**
 * VolumeMenu component for controlling browser volume and mute state.
 * Uses useVolume hook for state management and IPC.
 */
const VolumeMenu = memo(() => {
  const {volume, muted, globalMuted, handleVolumeChange, toggleMute} = useVolume();

  const effectiveMuted = useMemo(() => muted || globalMuted, [muted, globalMuted]);

  return (
    <div className="flex w-65 flex-col gap-4 p-4">
      {/* Header with title and mute button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VolumeLoudIcon className="size-5 text-muted" />
          <span className="text-sm font-semibold text-muted">Volume Control</span>
        </div>
        <Button
          size="sm"
          onPress={toggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          variant={effectiveMuted ? 'danger-soft' : 'tertiary'}>
          {effectiveMuted ? <VolumeCrossIcon className="size-4" /> : <VolumeLoudIcon className="size-4" />}
          {effectiveMuted ? 'Unmute' : 'Mute'}
        </Button>
      </div>

      {/* Current volume display */}
      <div className="flex items-center justify-center rounded-2xl bg-surface-secondary py-3">
        <div className="flex items-center gap-2">
          {effectiveMuted ? (
            <VolumeCrossIcon className="size-6 text-danger" />
          ) : volume === 0 ? (
            <VolumeIcon className="size-6 text-muted" />
          ) : volume < 50 ? (
            <VolumeIcon className="size-6 text-semi-muted" />
          ) : (
            <VolumeLoudIcon className="size-6 text-semi-muted" />
          )}
          <span className="text-2xl font-bold text-muted">{effectiveMuted ? 'Muted' : `${volume}%`}</span>
        </div>
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-3">
        <Slider
          step={1}
          minValue={0}
          value={volume}
          maxValue={100}
          className="w-full max-w-xs"
          onChange={handleVolumeChange}
          aria-valuetext={`${volume} percent`}>
          <Label>Volume</Label>
          <Slider.Output>
            {values => {
              return `${values.defaultChildren}%`;
            }}
          </Slider.Output>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>

        {/* Volume markers */}
        <div className="flex justify-between px-1 text-xs">
          {[0, 25, 50, 75, 100].map(val => (
            <button
              key={val}
              aria-label={`Set volume to ${val}%`}
              onClick={() => handleVolumeChange(val)}
              className="transition-colors duration-200 text-muted hover:text-foreground">
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Quick volume buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          variant="tertiary"
          aria-label="Decrease volume by 10%"
          isDisabled={effectiveMuted || volume === 0}
          onPress={() => handleVolumeChange(Math.max(0, volume - 10))}>
          −10%
        </Button>
        <Button
          size="sm"
          className="flex-1"
          variant="secondary"
          isDisabled={effectiveMuted}
          aria-label="Set volume to 50%"
          onPress={() => handleVolumeChange(50)}>
          50%
        </Button>
        <Button
          size="sm"
          className="flex-1"
          variant="tertiary"
          aria-label="Increase volume by 10%"
          isDisabled={effectiveMuted || volume === 100}
          onPress={() => handleVolumeChange(Math.min(100, volume + 10))}>
          +10%
        </Button>
      </div>
    </div>
  );
});

export default VolumeMenu;
