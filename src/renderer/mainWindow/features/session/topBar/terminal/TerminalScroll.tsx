import {Button} from '@heroui/react';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {AltArrowDown, AltArrowUp} from '@solar-icons/react-perf/Linear';
import {IDisposable} from '@xterm/xterm';
import {RefObject, useEffect, useState} from 'react';

import AnimateChild from '../../../../components/AnimateChild';
import LynxTooltip from '../../../../components/LynxTooltip';
import {XTermAPI} from '../../../../components/useXTerm';

type Props = {xtermRef: RefObject<XTermAPI | null>};

export default function TerminalScroll({xtermRef}: Props) {
  const [currentScroll, setCurrentScroll] = useState<number | undefined>(undefined);
  const [baseY, setBaseY] = useState<number | undefined>(undefined);

  useEffect(() => {
    let listener: IDisposable | undefined = undefined;

    const listenForScroll = () => {
      const ref = xtermRef.current;
      if (!ref) return;
      const term = ref.terminal;
      if (!term) return;

      setCurrentScroll(term.buffer.active.viewportY);
      setBaseY(term.buffer.active.baseY);

      return term.onScroll(value => {
        setCurrentScroll(value);
        setBaseY(term.buffer.active.baseY);
      });
    };

    listener = listenForScroll();

    setTimeout(() => {
      listener = listenForScroll();
    }, 2000);

    return () => listener?.dispose();
  }, []);

  const scrollTop = () => {
    const ref = xtermRef.current;
    if (!ref) return;
    const term = ref.terminal;
    if (!term) return;

    AddBreadcrumb_Renderer('Terminal: Scroll to top');
    term.scrollToTop();
  };

  const scrollBottom = () => {
    const ref = xtermRef.current;
    if (!ref) return;
    const term = ref.terminal;
    if (!term) return;

    AddBreadcrumb_Renderer('Terminal: Scroll to bottom');
    term.scrollToBottom();
  };

  return (
    <>
      <AnimateChild show={currentScroll !== 0 && currentScroll !== undefined}>
        <LynxTooltip delay={500} content="Scroll to top">
          <Button size="sm" variant="ghost" onPress={scrollTop} aria-label="Scroll to top" isIconOnly>
            <AltArrowUp />
          </Button>
        </LynxTooltip>
      </AnimateChild>

      <AnimateChild show={currentScroll !== undefined && currentScroll < (baseY || 0)}>
        <LynxTooltip delay={500} content="Scroll to bottom">
          <Button size="sm" variant="ghost" onPress={scrollBottom} aria-label="Scroll to bottom" isIconOnly>
            <AltArrowDown />
          </Button>
        </LynxTooltip>
      </AnimateChild>
    </>
  );
}
