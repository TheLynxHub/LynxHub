import {RefObject, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';

// [!NOTE] Using https://github.com/MinhOmega/react-theme-switch-animation

const isBrowser = typeof window !== 'undefined';

// Inject base CSS for view transitions
const injectBaseStyles = () => {
  if (isBrowser) {
    const styleId = 'theme-switch-base-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      const isHighResolution = window.innerWidth >= 3000 || window.innerHeight >= 2000;

      style.textContent = `
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
          ${isHighResolution ? 'transform: translateZ(0);' : ''}
        }
        
        ${
          isHighResolution
            ? `
        ::view-transition-group(root),
        ::view-transition-image-pair(root),
        ::view-transition-old(root),
        ::view-transition-new(root) {
          backface-visibility: hidden;
          perspective: 1000px;
          transform: translate3d(0, 0, 0);
        }
        `
            : ''
        }
      `;
      document.head.appendChild(style);
    }
  }
};

export enum ThemeAnimationType {
  CIRCLE = 'circle',
  BLUR_CIRCLE = 'blur-circle',
  QR_SCAN = 'qr-scan',
}

interface ReactThemeSwitchAnimationHook {
  ref: RefObject<HTMLDivElement | null>;
  toggleSwitchTheme: () => Promise<void>;
  isDarkMode: boolean;
}

export interface ReactThemeSwitchAnimationProps {
  duration?: number;
  easing?: string;
  pseudoElement?: string;
  globalClassName?: string;
  animationType?: ThemeAnimationType;
  blurAmount?: number;
  styleId?: string;
  isDarkMode?: boolean;
  onDarkModeChange?: (isDark: boolean) => void;
}

/**
 * Custom hook to handle theme switching with elegant view transition animations.
 * Provides multiple animation styles like CIRCLE, BLUR_CIRCLE, and QR_SCAN.
 */
export default function useModeAnimation(props?: ReactThemeSwitchAnimationProps): ReactThemeSwitchAnimationHook {
  const {
    duration: propsDuration = 750,
    easing = 'ease-in-out',
    pseudoElement = '::view-transition-new(root)',
    animationType = ThemeAnimationType.CIRCLE,
    blurAmount = 2,
    styleId = 'theme-switch-style',
    isDarkMode: externalDarkMode,
    onDarkModeChange,
  } = props || {};

  const isHighResolution = typeof window !== 'undefined' && (window.innerWidth >= 3000 || window.innerHeight >= 2000);

  const duration = isHighResolution ? Math.max(propsDuration * 0.8, 500) : propsDuration;

  // Inject base styles when the hook is initialized
  useEffect(() => {
    injectBaseStyles();
  }, []);

  const [internalDarkMode, setInternalDarkMode] = useState(
    isBrowser ? localStorage.getItem('theme') === 'dark' : false,
  );

  const isDarkMode = externalDarkMode ?? internalDarkMode;

  const setIsDarkMode = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isDarkMode) : value;
    if (onDarkModeChange) {
      onDarkModeChange(newValue);
    } else {
      setInternalDarkMode(newValue);
    }
  };

  const ref = useRef<HTMLDivElement | null>(null);

  const createBlurCircleMask = (blur: number) => {
    // Using a larger viewBox and centered circle for better scaling
    const isHighResolution = typeof window !== 'undefined' && (window.innerWidth >= 3000 || window.innerHeight >= 2000);

    const blurFilter = isHighResolution
      ? `<filter id="blur"><feGaussianBlur stdDeviation="${blur}" /></filter>`
      : `<filter id="blur"><feGaussianBlur stdDeviation="${blur}" /></filter>`;

    const circleRadius = isHighResolution ? 20 : 25;

    return (
      `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">` +
      `<defs>${blurFilter}</defs><circle cx="0" cy="0" r="${circleRadius}" fill="white" filter="url(%23blur)"/></svg>')`
    );
  };

  const toggleSwitchTheme = async () => {
    if (
      !ref.current ||
      !(document as any).startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsDarkMode(isDarkMode => !isDarkMode);
      return;
    }

    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const {top, left, width, height} = ref.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;

    // Calculate the distance to each corner of the viewport
    const topLeft = Math.hypot(x, y);
    const topRight = Math.hypot(window.innerWidth - x, y);
    const bottomLeft = Math.hypot(x, window.innerHeight - y);
    const bottomRight = Math.hypot(window.innerWidth - x, window.innerHeight - y);

    // Find the maximum distance to ensure animation covers the entire viewport
    const maxRadius = Math.max(topLeft, topRight, bottomLeft, bottomRight);

    const viewportSize = Math.max(window.innerWidth, window.innerHeight) + 200;

    const isHighResolution = window.innerWidth >= 3000 || window.innerHeight >= 2000;
    const scaleFactor = isHighResolution ? 2.5 : 4;

    const optimalMaskSize = isHighResolution ? Math.min(viewportSize * scaleFactor, 5000) : viewportSize * scaleFactor;

    if (animationType === ThemeAnimationType.BLUR_CIRCLE) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;

      // Improved sizing and animation for corner positions
      const blurFactor = isHighResolution ? 1.5 : 1.2;
      const finalMaskSize = Math.max(optimalMaskSize, maxRadius * 2.5);

      styleElement.textContent = `
        ::view-transition-group(root) {
          animation-duration: ${duration}ms;
          animation-timing-function: ${
            isHighResolution
              ? 'cubic-bezier(0.2, 0, 0.2, 1)'
              : 'linear(' +
                '0 0%, 0.2342 12.49%, 0.4374 24.99%,' +
                '0.6093 37.49%, 0.6835 43.74%,' +
                '0.7499 49.99%, 0.8086 56.25%,' +
                '0.8593 62.5%, 0.9023 68.75%, 0.9375 75%,' +
                '0.9648 81.25%, 0.9844 87.5%,' +
                '0.9961 93.75%, 1 100%' +
                ')'
          };
          will-change: transform;
        }

        ::view-transition-new(root) {
          mask: ${createBlurCircleMask(blurAmount * blurFactor)} 0 0 / 100% 100% no-repeat;
          mask-position: ${x}px ${y}px;
          animation: maskScale ${duration}ms ${easing};
          transform-origin: ${x}px ${y}px;
          will-change: mask-size, mask-position;
        }

        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: maskScale ${duration}ms ${easing};
          transform-origin: ${x}px ${y}px;
          z-index: -1;
          will-change: mask-size, mask-position;
        }

        @keyframes maskScale {
          0% {
            mask-size: 0px;
            mask-position: ${x}px ${y}px;
          }
          100% {
            mask-size: ${finalMaskSize}px;
            mask-position: ${x - finalMaskSize / 2}px ${y - finalMaskSize / 2}px;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }

    let stateUpdated = false;

    try {
      const transition = (document as any).startViewTransition(() => {
        stateUpdated = true;
        flushSync(() => {
          setIsDarkMode(isDarkMode => !isDarkMode);
        });
      });

      // Catch and suppress rejection on finished/update promises if aborted
      transition?.finished?.catch(() => {});
      transition?.updateCallbackDone?.catch(() => {});

      if (transition?.ready) {
        await transition.ready;
      }

      if (animationType === ThemeAnimationType.CIRCLE) {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
          },
          {
            duration,
            easing,
            pseudoElement,
          },
        );
      }

      if (animationType === ThemeAnimationType.QR_SCAN) {
        const scanLineWidth = isHighResolution ? 8 : 4;
        document.documentElement.animate(
          {
            clipPath: [
              `polygon(0% 0%, ${scanLineWidth}px 0%, ${scanLineWidth}px 100%, 0% 100%)`,
              `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
            ],
          },
          {
            duration,
            easing,
            pseudoElement,
          },
        );
      }
    } catch (e: any) {
      if (!stateUpdated) {
        setIsDarkMode(isDarkMode => !isDarkMode);
      }
      if (e?.name !== 'InvalidStateError' && e?.name !== 'AbortError') {
        console.warn('Theme view transition error:', e);
      }
    } finally {
      if (animationType === ThemeAnimationType.BLUR_CIRCLE) {
        setTimeout(() => {
          const styleElement = document.getElementById(styleId);
          if (styleElement) {
            styleElement.remove();
          }
        }, duration);
      }
    }
  };

  return {
    ref,
    toggleSwitchTheme,
    isDarkMode,
  };
}
