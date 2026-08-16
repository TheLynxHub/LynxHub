import {Alert, Button, buttonVariants, Chip, Link} from '@heroui/react';
import {APP_NAME} from '@lynx_common/consts';
import applicationIpc from '@lynx_shared/ipc/application';
import {BoltIcon, CheckCircleIcon, CheckReadIcon, DangerCircleIcon} from '@solar-icons/react/bold-duotone';
import {motion, Variants} from 'framer-motion';
import {useCallback, useEffect, useState} from 'react';

import CheckRow from './CheckRow';
import {RowData} from './types';

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

type Props = {onComplete: () => void};

const PWS7ReleasePage = 'https://github.com/PowerShell/PowerShell/releases/latest';

export default function StepUpdate({onComplete}: Props) {
  const [pwsh, setPwsh] = useState<RowData>({result: 'unknown'});
  const pwshSatisfied = pwsh.result === 'ok';

  const checkPwsh = useCallback(() => {
    setPwsh({result: 'checking'});
    applicationIpc.invoke
      .checkPwsh7Installed()
      .then(result => setPwsh(result ? {result: 'ok', label: result} : {result: 'failed'}))
      .catch(() => setPwsh({result: 'failed'}));
  }, []);

  useEffect(() => {
    checkPwsh();
  }, [checkPwsh]);

  return (
    <motion.div
      exit="exit"
      key="update"
      animate="enter"
      initial="hidden"
      variants={containerVariants}
      className="flex flex-col justify-between h-full max-w-2xl mx-auto py-2">
      {/* Header */}
      <motion.div className="space-y-2" variants={itemVariants}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <BoltIcon className="size-5" />
          </div>
          <Chip color="accent" variant="soft" className="text-xs font-semibold">
            System Requirement Update
          </Chip>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Welcome back to {APP_NAME}</h1>
        <p className="text-xs md:text-sm text-muted leading-relaxed">
          Some core system requirements have been upgraded. To ensure optimal performance and compatibility with modern
          terminal features, PowerShell 7+ is required on Windows.
        </p>
      </motion.div>

      {/* Check Card */}
      <motion.div
        variants={itemVariants}
        className="bg-surface/70 border border-surface-secondary p-5 rounded-3xl backdrop-blur-sm space-y-4 my-4">
        <CheckRow
          status={pwsh}
          label="PowerShell 7+"
          icon={<BoltIcon className="size-4 text-blue-500" />}
          description="Required for modern Windows scripting and automation (pwsh v7 or later)"
        />

        {pwsh.result === 'failed' && (
          <Alert status="warning" className="rounded-2xl border border-warning/20">
            <Alert.Indicator>
              <DangerCircleIcon className="size-5 text-warning" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title className="text-xs font-bold">PowerShell 7+ is Missing</Alert.Title>
              <Alert.Description className="text-xs text-muted">
                PowerShell 7 or later is required to run new terminal features. Please download and install it.
              </Alert.Description>
            </Alert.Content>
            <Link
              className={buttonVariants({variant: 'primary', size: 'sm'})}
              onPress={() => applicationIpc.send.openUrlDefaultBrowser(PWS7ReleasePage)}>
              Get PowerShell 7
              <Link.Icon />
            </Link>
          </Alert>
        )}
      </motion.div>

      {/* Action CTA */}
      <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
        <div className="text-xs">
          {pwshSatisfied ? (
            <div className="flex items-center gap-1.5 text-success font-medium">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>PowerShell 7+ detected. Ready to restart.</span>
            </div>
          ) : (
            <span className="text-muted">Waiting for PowerShell 7+ verification...</span>
          )}
        </div>

        <Button
          onPress={onComplete}
          isDisabled={!pwshSatisfied}
          variant={pwshSatisfied ? 'primary' : 'secondary'}
          className="font-bold px-7 h-11 text-xs shadow-md shadow-accent/20">
          {pwshSatisfied && <CheckReadIcon className="size-4 shrink-0" />}
          <span>{pwshSatisfied ? `Finish & Restart ${APP_NAME}` : 'Awaiting Requirement...'}</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
