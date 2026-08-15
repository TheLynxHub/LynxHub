import {cn, Spinner} from '@heroui/react';
import {InitialSteps} from '@lynx_common/types/plugins/modules';
import {UnreadIcon} from '@solar-icons/react/linear';
import {memo, useEffect, useRef} from 'react';

import {useHasScroll} from '../../../../../../utils/hooks';

export interface StepProgressProps {
  steps: InitialSteps;
  current: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  titleClassName?: string;
}

function getStatus(index: number, current: number): 'complete' | 'current' | 'upcoming' {
  if (index < current) return 'complete';
  if (index === current) return 'current';
  return 'upcoming';
}

function StepIndicator({status}: {status: 'complete' | 'current' | 'upcoming'}) {
  if (status === 'current') {
    return (
      <div className="flex size-5 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
        <Spinner color="accent" className="flex" />
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="flex size-5 items-center justify-center rounded-full bg-success-soft-hover text-success">
        <UnreadIcon className="size-4" />
      </div>
    );
  }

  return <div className="size-5 rounded-full border border-surface-tertiary bg-surface-secondary/30" />;
}

/**
 * Visual progress stepper component supporting both horizontal and vertical orientations.
 */
function StepProgress({steps, current, orientation = 'horizontal', className, titleClassName}: StepProgressProps) {
  const {hasScroll, containerRef, setContainerRef} = useHasScroll();
  const currentActiveItem = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const item = currentActiveItem.current;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            if (hasScroll && item && containerRef) {
              const offsetLeft = item.offsetLeft;
              containerRef.scrollTo({behavior: 'smooth', left: offsetLeft});
            }
          }
        });
      },
      {root: containerRef},
    );

    if (item) observer.observe(item);

    return () => observer.disconnect();
  }, [current, hasScroll]);

  if (steps.length === 0) return null;

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-3', className)}>
        {steps.map((item, index) => {
          const status = getStatus(index, current);
          const title = typeof item === 'string' ? item : item.title;

          return (
            <div key={index} className="flex items-start gap-3">
              <div className="pt-0.5">
                <StepIndicator status={status} />
              </div>
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'truncate text-sm',
                    status === 'complete' && 'text-muted',
                    status === 'current' && 'font-semibold text-surface-foreground',
                    status === 'upcoming' && 'text-semi-muted',
                    titleClassName,
                  )}>
                  {title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={setContainerRef} className={cn('overflow-x-scroll scrollbar-hide px-1 py-1', className)}>
      <div className="flex min-w-max items-start">
        {steps.map((item, index) => {
          const status = getStatus(index, current);
          const isLast = index === steps.length - 1;
          const title = typeof item === 'string' ? item : item.title;

          return (
            <div
              ref={node => {
                if (status === 'current') {
                  currentActiveItem.current = node;
                }
              }}
              key={index}
              className="flex items-start">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <StepIndicator status={status} />
                <span
                  className={cn(
                    'truncate text-center text-xs',
                    status === 'complete' && 'text-muted',
                    status === 'current' && 'font-semibold text-surface-foreground',
                    status === 'upcoming' && 'text-semi-muted',
                    titleClassName,
                  )}
                  title={title}>
                  {title}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 mt-2.5 h-px w-12 sm:w-20',
                    index < current ? 'bg-success/40' : 'bg-surface-secondary',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(StepProgress);
