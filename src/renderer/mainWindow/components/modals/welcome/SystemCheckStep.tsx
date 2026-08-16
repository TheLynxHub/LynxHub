import {Button} from '@heroui/react';
import {CheckCircleIcon, DangerCircleIcon} from '@solar-icons/react/bold-duotone';
import {ArrowRightIcon} from '@solar-icons/react/line-duotone';
import {motion, Variants} from 'framer-motion';
import {Dispatch, SetStateAction, useMemo, useState} from 'react';

import PluginSelector from './PluginSelector';
import RequirementsChecker from './RequirementsChecker';
import {RequirementStatus} from './types';

const containerVariants: Variants = {
  hidden: {opacity: 0},
  enter: {
    opacity: 1,
    transition: {staggerChildren: 0.08, delayChildren: 0.1},
  },
  exit: {opacity: 0, y: -15, transition: {duration: 0.25}},
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 14},
  enter: {opacity: 1, y: 0, transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]}},
};

type Props = {
  onNext: () => void;
  setInstalledPlugins: Dispatch<SetStateAction<string[]>>;
  setRequirementStatus: (status: RequirementStatus) => void;
  installedPlugins: string[];
};

export default function StepSystemCheck({onNext, setInstalledPlugins, setRequirementStatus, installedPlugins}: Props) {
  const [requirementsSatisfied, setRequirementsSatisfied] = useState(false);
  const [isInstallingPlugins, setIsInstallingPlugins] = useState(false);

  const canContinue = useMemo(
    () => requirementsSatisfied && !isInstallingPlugins,
    [requirementsSatisfied, isInstallingPlugins],
  );

  return (
    <motion.div
      exit="exit"
      animate="enter"
      initial="hidden"
      key="system-check"
      variants={containerVariants}
      className="h-full flex flex-col justify-between py-1">
      {/* Top Heading */}
      <motion.div className="mb-2.5" variants={itemVariants}>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">System & Extensions</h2>
        <p className="text-xs md:text-sm text-muted mt-0.5">
          Verify core dependencies and optionally pre-install starter plugins for your AI workspace.
        </p>
      </motion.div>

      {/* Two-Column Grid for Requirements & Plugins */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
        <div className="h-full min-h-0">
          <RequirementsChecker onReport={setRequirementStatus} onStatusChange={setRequirementsSatisfied} />
        </div>
        <div className="h-full min-h-0">
          <PluginSelector
            isInstalling={isInstallingPlugins}
            installedPlugins={installedPlugins}
            setInstalling={setIsInstallingPlugins}
            setInstalledPlugins={setInstalledPlugins}
            requirementsSatisfied={requirementsSatisfied}
          />
        </div>
      </motion.div>

      {/* Bottom Action & Status Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between pt-3 mt-2">
        <div className="flex items-center gap-2 text-xs">
          {canContinue ? (
            <div className="flex items-center gap-1.5 text-success font-medium">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>Core requirements satisfied. Ready to proceed.</span>
            </div>
          ) : isInstallingPlugins ? (
            <span className="text-muted font-medium">Installing chosen extensions, please wait...</span>
          ) : (
            <div className="flex items-center gap-1.5 text-warning font-medium">
              <DangerCircleIcon className="size-4 shrink-0" />
              <span>Core requirements must pass before continuing.</span>
            </div>
          )}
        </div>

        <Button
          size="md"
          onPress={onNext}
          variant="primary"
          isDisabled={!canContinue}
          className="font-bold px-7 h-10 text-xs shadow-md shadow-accent/20">
          Continue
          <ArrowRightIcon className="size-4 shrink-0" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
