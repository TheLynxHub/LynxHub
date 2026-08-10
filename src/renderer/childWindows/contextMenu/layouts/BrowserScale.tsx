import {Button, Label, Slider} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import storageIpc from '@lynx_shared/ipc/storage';
import {MagnifierIcon, RefreshIcon} from '@solar-icons/react/bold-duotone';
import {isArray} from 'lodash-es';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {contextActions, useContextState} from '../redux/reducer';
import {ContextDispatch} from '../redux/store';

/**
 * BrowserScale Component
 * Allows the user to adjust the zoom level of the browser.
 */
const BrowserScale = memo(function BrowserScale() {
  const {id, factor} = useContextState('browserScale');

  const dispatch = useDispatch<ContextDispatch>();

  const updateZoom = useCallback(
    (zoom: number) => {
      dispatch(contextActions.updateZoomFactor(zoom));
      browserIpc.send.setZoomFactor(id, zoom / 100);
      storageIpc.update('cards', {zoomFactor: zoom / 100});
    },
    [dispatch, id],
  );

  const onChange = useCallback(
    (value: number | number[]) => {
      if (!isArray(value)) updateZoom(value);
    },
    [updateZoom],
  );

  const handleReset = useCallback(() => {
    updateZoom(100);
  }, [updateZoom]);

  return (
    <div className="flex flex-col gap-4 p-4 w-65">
      {/* Header with title and reset button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MagnifierIcon aria-hidden="true" className="size-5 text-muted" />
          <span className="text-sm font-semibold text-muted">Browser Scale</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onPress={handleReset}
          isDisabled={factor === 100}
          aria-label="Reset zoom to 100%">
          <RefreshIcon className="size-4" />
          Reset
        </Button>
      </div>

      {/* Current zoom display */}
      <div aria-live="polite" className="flex items-center justify-center rounded-2xl bg-surface-secondary py-3">
        <span className="text-2xl font-bold text-muted">{Math.round(factor)}%</span>
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-3">
        <Slider step={5} minValue={10} value={factor} maxValue={300} onChange={onChange} className="w-full max-w-xs">
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

        {/* Scale markers */}
        <div className="flex justify-between px-1 text-xs text-muted">
          {[10, 50, 100, 150, 200, 300].map(zoom => (
            <button
              className={
                `transition-colors duration-200 text-muted hover:text-foreground` +
                ` ${zoom === 100 ? 'font-medium' : ''}`
              }
              key={zoom}
              onClick={() => updateZoom(zoom)}
              aria-label={`Set zoom to ${zoom}%`}>
              {zoom}%
            </button>
          ))}
        </div>
      </div>

      {/* Quick zoom buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="tertiary"
          className="flex-1"
          aria-label="Decrease zoom by 10%"
          onPress={() => updateZoom(Math.max(10, factor - 10))}>
          −10%
        </Button>
        <Button
          size="sm"
          className="flex-1"
          variant="secondary"
          aria-label="Reset to 100%"
          isDisabled={factor === 100}
          onPress={() => updateZoom(100)}>
          100%
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          className="flex-1"
          aria-label="Increase zoom by 10%"
          onPress={() => updateZoom(Math.min(300, factor + 10))}>
          +10%
        </Button>
      </div>
    </div>
  );
});

export default BrowserScale;
