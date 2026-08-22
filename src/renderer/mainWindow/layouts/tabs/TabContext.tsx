import {createContext, useContext} from 'react';

export const TabContext = createContext<string | undefined>(undefined);

export const useCurrentTabId = () => useContext(TabContext);
