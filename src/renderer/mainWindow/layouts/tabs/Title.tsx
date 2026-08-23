import {Dispatch, memo, SetStateAction, useEffect, useRef} from 'react';

type Props = {
  title: string;
  setIsTruncated: Dispatch<SetStateAction<boolean>>;
};

/**
 * Displays the tab title and detects truncation in real-time.
 * Uses ResizeObserver to update `isTruncated` continuously as tab width shrinks or expands.
 */
const TabTitle = memo(({title, setIsTruncated}: Props) => {
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return undefined;

    const checkTruncation = () => {
      const truncated = el.clientWidth < el.scrollWidth;
      setIsTruncated(truncated);
    };

    checkTruncation();

    const observer = new ResizeObserver(() => {
      checkTruncation();
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [title, setIsTruncated]);

  return (
    <span ref={spanRef} className="overflow-hidden whitespace-nowrap text-sm font-normal select-none text-clip">
      {title}
    </span>
  );
});

export default TabTitle;
