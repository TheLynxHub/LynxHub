import {ReactNode} from 'react';

import useInertRemover from '../utils/useInertRemover';
import {TabContext} from './tabs/TabContext';

type Props = {children: ReactNode; tabID: string; isActive: boolean};

export default function TabWrapper({children, tabID, isActive}: Props) {
  const onRef = useInertRemover();
  const visibilityClass = isActive ? 'flex flex-row' : 'hidden';

  return (
    <TabContext.Provider value={tabID}>
      <div
        ref={onRef}
        id={`${tabID}_wrapper`}
        style={{transform: 'translate(0)'}}
        className={`${visibilityClass} relative z-10 size-full overflow-hidden pointer-events-none`}>
        {children}
      </div>
    </TabContext.Provider>
  );
}
