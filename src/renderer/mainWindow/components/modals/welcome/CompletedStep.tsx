import {Button} from '@heroui/react';
import {APP_NAME} from '@lynx_common/consts';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {motion} from 'framer-motion';

import {RequirementStatus} from './types';

const containerVariants = {
  hidden: {opacity: 0, y: 20},
  enter: {opacity: 1, y: 0, transition: {staggerChildren: 0.1, delayChildren: 0.2}},
  exit: {opacity: 0, y: -20},
};

const itemVariants = {
  hidden: {opacity: 0, y: 10},
  enter: {opacity: 1, y: 0},
};

type Props = {
  onComplete: () => void;
  installedPlugins: string[];
  requirementStatus: RequirementStatus | null;
};

export default function StepComplete({onComplete, installedPlugins, requirementStatus}: Props) {
  return (
    <motion.div
      exit="exit"
      key="complete"
      animate="enter"
      initial="hidden"
      variants={containerVariants}
      className="flex flex-col items-center justify-center h-full text-center">
      <motion.div variants={itemVariants} className="bg-green-100 dark:bg-green-500/20 p-4 rounded-full mb-6">
        <CheckReadIcon className="size-10 text-green-600 dark:text-green-400" />
      </motion.div>
      <motion.h2 variants={itemVariants} className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
        All Set!
      </motion.h2>
      <motion.p variants={itemVariants} className="max-w-xl text-lg text-gray-600 dark:text-gray-300 mb-8">
        You're ready to go. A quick restart is needed to apply all the changes and start using the app.
      </motion.p>

      <motion.div
        variants={itemVariants}
        className="w-full max-w-lg bg-gray-50 dark:bg-white/10 p-4 rounded-3xl text-left mb-8">
        <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">Setup Summary</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 font-bold">
          <p>
            <span className="font-medium">Git:</span> {requirementStatus?.git || 'Checked'}
          </p>
          {requirementStatus?.pwsh && (
            <p>
              <span className="font-medium">PowerShell:</span> {requirementStatus.pwsh}
            </p>
          )}
          <p>
            <span className="font-medium">Main Module:</span> {requirementStatus?.appModule || 'Installed'}
          </p>
          <p>
            <span className="font-medium">Installed Extensions:</span> {installedPlugins.join(', ') || 'None'}
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button size="lg" variant="primary" onPress={onComplete} className="font-semibold h-12">
          <CheckReadIcon className="size-5" />
          Finish & Restart {APP_NAME}
        </Button>
      </motion.div>
    </motion.div>
  );
}
