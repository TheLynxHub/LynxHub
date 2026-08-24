import {ScreenShareSources} from '@lynx_common/types/shareScreen';
import shareScreenIpc from '@lynx_shared/ipc/shareScreen';
import {useCallback, useEffect, useState} from 'react';

export type UseScreenSourcesReturn = {
  isLoading: boolean;
  screens: ScreenShareSources[];
  windows: ScreenShareSources[];
};

/**
 * Custom hook to fetch available screen and window sources for screen sharing.
 *
 * @returns {UseScreenSourcesReturn} An object containing loading state, screens, and windows.
 */
export function useScreenSources(): UseScreenSourcesReturn {
  const [screens, setScreens] = useState<ScreenShareSources[]>([]);
  const [windows, setWindows] = useState<ScreenShareSources[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSources = useCallback(() => {
    setIsLoading(true);

    Promise.all([shareScreenIpc.getScreenSources(), shareScreenIpc.getWindowSources()])
      .then(([fetchedScreens, fetchedWindows]) => {
        setScreens(fetchedScreens);
        setWindows(fetchedWindows);
      })
      .catch(error => {
        console.error('Failed to fetch screen sources:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSources();
    return shareScreenIpc.onRequestSources(() => {
      fetchSources();
    });
  }, [fetchSources]);

  return {isLoading, screens, windows};
}
