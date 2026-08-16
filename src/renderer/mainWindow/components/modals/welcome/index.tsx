import {useAppState} from '@lynx/redux/reducers/app';
import {AnimatePresence, motion} from 'framer-motion';

import Background from './Background';
import OnboardingWizard from './OnboardingWizard';

export default function Initializer() {
  const {showWizard, isUpgradeFlow} = useAppState('initializer');

  const containerHeight = !isUpgradeFlow ? 'h-[85vh] min-h-[580px]' : 'h-auto';
  const modalClass =
    `relative w-[88vw] ${containerHeight} min-w-[680px] max-w-[960px] max-h-[720px] ` +
    'bg-background/95 border border-white/10 dark:border-white/10 rounded-4xl shadow-2xl ' +
    'shadow-black/40 overflow-hidden backdrop-blur-2xl';

  return (
    <AnimatePresence>
      {showWizard && (
        <motion.div
          exit={{opacity: 0}}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.25}}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            className={modalClass}
            animate={{scale: 1, y: 0, opacity: 1}}
            exit={{scale: 0.96, y: 16, opacity: 0}}
            initial={{scale: 0.96, y: 16, opacity: 0}}
            transition={{type: 'spring', damping: 26, stiffness: 320}}>
            <Background />

            <OnboardingWizard isUpgradeFlow={isUpgradeFlow} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
