import type {ReactNode} from 'react';

import {useDocumentDarkMode} from './hooks';

/**
 * Props for the shared renderer HeroUI provider wrapper.
 */
interface SharedHeroUIProviderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps child windows with HeroUI providers and synchronizes dark/light classes.
 */
export default function HeroUIProvider({children, className = ''}: SharedHeroUIProviderProps) {
  const isDark = useDocumentDarkMode();

  return <div className={`text-foreground ${isDark ? 'dark' : 'light'} ${className}`}>{children}</div>;
}
