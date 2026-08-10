import {Button} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {MagnifierZoomInIcon} from '@solar-icons/react/bold-duotone';
import {memo, useEffect, useRef} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

type Props = {
  /**
   * The ID of the browser/card.
   */
  id: string;
};

/**
 * A button to control the zoom level of the browser tab.
 */
const BrowserZoom = memo(({id}: Props) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const openZoomMenu = () => {
    AddBreadcrumb_Renderer('Browser: Open zoom control');
    const bounds = btnRef.current?.getBoundingClientRect();
    if (bounds) {
      const {x, y} = bounds;
      browserIpc.send.openZoom(id, {x: x - 125, y: y + 30});
    } else {
      browserIpc.send.openZoom(id);
    }
  };

  useEffect(() => {
    const removeListener = browserIpc.on.onZoomChanged((eventId, _) => {
      if (eventId === id) {
        openZoomMenu();
      }
    });
    return () => {
      removeListener();
    };
  }, [id]);

  return (
    <LynxTooltip delay={1000} content="Zoom Control">
      <Button size="sm" ref={btnRef} variant="ghost" onPress={openZoomMenu} aria-label="Zoom Control" isIconOnly>
        <MagnifierZoomInIcon className="size-4" />
      </Button>
    </LynxTooltip>
  );
});

BrowserZoom.displayName = 'BrowserZoom';

export default BrowserZoom;
