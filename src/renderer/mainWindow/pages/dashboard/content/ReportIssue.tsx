import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import {SiGithub} from '@icons-pack/react-simple-icons';
import SettingsSection from '@lynx/components/SettingsSection';
import {useUserState} from '@lynx/redux/reducers/user';
import {APP_VERSION, GITHUB_URL, LYNXHUB_WEBSITE} from '@lynx_common/consts';
import userIpc from '@lynx_shared/ipc/user';
import {Bug, ChatSquare, Lightbulb, SquareTopDown} from '@solar-icons/react-perf/BoldDuotone';
import {memo, SyntheticEvent, useCallback, useMemo, useState} from 'react';

export const DashboardReportIssueId = 'settings_report_issue_elem';

type FeedbackType = 'bug' | 'feature' | 'general';

/** REDESIGNED: Comprehensive and interactive Help & Feedback Form */
const DashboardReportIssue = memo(() => {
  const isLoggedIn = useUserState('isLoggedIn');
  const userData = useUserState('userData');

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedActual, setExpectedActual] = useState('');
  const [useCase, setUseCase] = useState('');
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  const isGitHubConnected = useMemo(() => {
    return isLoggedIn && userData.connectedProviders?.includes('github');
  }, [isLoggedIn, userData.connectedProviders]);

  const clearFormFields = useCallback(() => {
    setTitle('');
    setDescription('');
    setSteps('');
    setExpectedActual('');
    setUseCase('');
    setAttachDiagnostics(true);
  }, []);

  const clearForm = useCallback(() => {
    clearFormFields();
    setSubmitResult(null);
  }, [clearFormFields]);

  const handleTypeChange = useCallback((value: string) => {
    setFeedbackType(value as FeedbackType);
    setSubmitResult(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      setSubmitResult(null);

      if (!title.trim() || !description.trim()) {
        return;
      }

      // 1. Build Issue Body based on Feedback Type
      let body: string;

      if (feedbackType === 'bug') {
        body = `### Description\n${description.trim()}\n\n`;
        body += `### Steps to Reproduce\n${steps.trim() || 'No steps provided.'}\n\n`;
        const expectedVal = expectedActual.trim() || 'No expected/actual behavior described.';
        body += `### Expected vs Actual Behavior\n${expectedVal}\n\n`;
        if (attachDiagnostics) {
          body += `### System Diagnostics\n`;
          body += `- **App Version**: ${APP_VERSION}\n`;
          body += `- **OS Platform**: ${window.osPlatform || 'unknown'}\n`;
          body += `- **User Agent**: ${window.navigator?.userAgent || 'unknown'}\n`;
          body += `- **User Tier**: ${isLoggedIn ? userData.tier : 'Guest'}\n`;
        }
      } else if (feedbackType === 'feature') {
        body = `### Feature Description\n${description.trim()}\n\n`;
        body += `### Use Case / Why is this useful?\n${useCase.trim() || 'No use case provided.'}\n`;
      } else {
        body = `### Message\n${description.trim()}\n`;
      }

      // 2. Submit Logic
      if (isGitHubConnected) {
        // Auto-create issue via API
        setIsSubmitting(true);
        try {
          const res = await userIpc.account.submitFeedback({
            title: title.trim(),
            body,
          });
          setSubmitResult(res);
          if (res.success) {
            clearFormFields();
          }
        } catch (err: any) {
          console.error('Failed to submit feedback:', err);
          setSubmitResult({
            success: false,
            error: err.message || 'An unexpected error occurred.',
          });
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Redirect to GitHub new issue page with prefilled template parameters
        const queryParams = new URLSearchParams({
          title: title.trim(),
          body,
        });
        const url = `${GITHUB_URL}/issues/new?${queryParams.toString()}`;
        window.open(url);

        setSubmitResult({
          success: true,
          url,
        });
      }
    },
    [
      feedbackType,
      title,
      description,
      steps,
      expectedActual,
      useCase,
      attachDiagnostics,
      isLoggedIn,
      userData.tier,
      isGitHubConnected,
      clearFormFields,
    ],
  );

  return (
    <SettingsSection
      title="Help & Feedback"
      id={DashboardReportIssueId}
      icon={<Bug className="size-5" aria-hidden="true" />}>
      <div className="flex flex-col gap-2 max-w-2xl mx-auto py-2">
        <p className="text-sm text-default-500 text-center mb-4">
          Found a bug, have a feature request, or want to ask a question? Fill out the form below.
        </p>

        {/* Feedback Type Selection */}
        <div className="flex flex-col gap-2 mb-4">
          <Label className="text-sm font-semibold">Feedback Type</Label>
          <RadioGroup
            value={feedbackType}
            orientation="horizontal"
            onChange={handleTypeChange}
            aria-label="Feedback type selection">
            <Radio value="bug">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <div className="flex items-center gap-1.5 font-medium">
                  <Bug aria-hidden="true" className="size-4 text-danger" />
                  <span>Report Issue</span>
                </div>
              </Radio.Content>
            </Radio>
            <Radio value="feature">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <div className="flex items-center gap-1.5 font-medium">
                  <Lightbulb aria-hidden="true" className="size-4 text-warning" />
                  <span>Feature Request</span>
                </div>
              </Radio.Content>
            </Radio>
            <Radio value="general">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <div className="flex items-center gap-1.5 font-medium">
                  <ChatSquare aria-hidden="true" className="size-4 text-primary" />
                  <span>General Feedback</span>
                </div>
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </div>

        {/* Dynamic Form */}
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title / Subject */}
          <TextField name="title" className="w-full" isRequired>
            <Label>
              {feedbackType === 'bug' ? 'Issue Title' : feedbackType === 'feature' ? 'Feature Title' : 'Subject'}
            </Label>
            <Input
              onChange={e => {
                setTitle(e.target.value);
                setSubmitResult(null);
              }}
              placeholder={
                feedbackType === 'bug'
                  ? 'e.g. App crashes when clicking sync button…'
                  : feedbackType === 'feature'
                    ? 'e.g. Add dark theme option to main settings…'
                    : 'e.g. Question about support tiers…'
              }
              value={title}
              autoComplete="off"
            />
          </TextField>

          {/* Description / Message */}
          <TextField className="w-full" name="description" isRequired>
            <Label>
              {feedbackType === 'bug' ? 'Description' : feedbackType === 'feature' ? 'Feature Description' : 'Message'}
            </Label>
            <TextArea
              onChange={e => {
                setDescription(e.target.value);
                setSubmitResult(null);
              }}
              placeholder={
                feedbackType === 'bug'
                  ? 'What happened? Describe the issue you encountered…'
                  : feedbackType === 'feature'
                    ? 'Describe the feature you would like to see…'
                    : 'Write your general feedback or question here…'
              }
              autoComplete="off"
              value={description}
              style={{resize: 'vertical'}}
              rows={feedbackType === 'general' ? 6 : 3}
            />
          </TextField>

          {/* Bug Report Specifics */}
          {feedbackType === 'bug' && (
            <>
              <TextField name="steps" className="w-full">
                <Label>Steps to Reproduce</Label>
                <TextArea
                  onChange={e => {
                    setSteps(e.target.value);
                    setSubmitResult(null);
                  }}
                  rows={3}
                  value={steps}
                  autoComplete="off"
                  style={{resize: 'vertical'}}
                  placeholder="1. Go to settings page&#10;2. Click on the sync button&#10;3. See the error dialog"
                />
              </TextField>

              <TextField className="w-full" name="expectedActual">
                <Label>Expected vs. Actual Behavior</Label>
                <TextArea
                  onChange={e => {
                    setExpectedActual(e.target.value);
                    setSubmitResult(null);
                  }}
                  placeholder={
                    'Expected: profile syncs and updates successfully.\n' + 'Actual: progress bar freezes at 50%.'
                  }
                  rows={3}
                  autoComplete="off"
                  value={expectedActual}
                  style={{resize: 'vertical'}}
                />
              </TextField>

              <Checkbox isSelected={attachDiagnostics} onChange={setAttachDiagnostics}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span>Include system diagnostic information (OS, App Version, Login Tier)</span>
                </Checkbox.Content>
              </Checkbox>
            </>
          )}

          {/* Feature Request Specifics */}
          {feedbackType === 'feature' && (
            <TextField name="useCase" className="w-full">
              <Label>Use Case / Why is this useful?</Label>
              <TextArea
                onChange={e => {
                  setUseCase(e.target.value);
                  setSubmitResult(null);
                }}
                rows={3}
                value={useCase}
                autoComplete="off"
                style={{resize: 'vertical'}}
                placeholder="How would this improve your experience or solve a workflow problem?"
              />
            </TextField>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-2">
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onPress={clearForm}
              isDisabled={isSubmitting || (!title && !description)}>
              Clear
            </Button>
            <Button
              size="sm"
              type="submit"
              variant="primary"
              isDisabled={isSubmitting || !title.trim() || !description.trim()}>
              {isSubmitting ? (
                <Spinner size="sm" color="current" />
              ) : isGitHubConnected ? (
                'Submit Feedback'
              ) : (
                <>
                  <SiGithub aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>Open on GitHub</span>
                  <SquareTopDown aria-hidden="true" className="size-3.5 shrink-0" />
                </>
              )}
            </Button>
          </div>
        </Form>

        {/* GitHub Linked/Not Linked Guidance Banner */}
        {!isGitHubConnected && (
          <Alert status="default" className="text-xs mt-4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                {isLoggedIn
                  ? 'Tip: Link your GitHub account in profile settings to automatically submit feedback ' +
                    'directly from the app.'
                  : 'Tip: Log in and link your GitHub account in profile settings to automatically submit ' +
                    'feedback directly from the app.'}
              </Alert.Description>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => window.open(`${LYNXHUB_WEBSITE}/account`)}
                className="mt-2 sm:hidden font-semibold border border-divider">
                Manage Account
              </Button>
            </Alert.Content>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => window.open(`${LYNXHUB_WEBSITE}/account`)}
              className="hidden sm:block font-semibold border border-divider">
              Manage Account
            </Button>
          </Alert>
        )}

        {/* Results Banner */}
        {submitResult && (
          <Alert className="mt-2" status={submitResult.success ? 'success' : 'danger'}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {submitResult.success
                  ? isGitHubConnected
                    ? 'Feedback Submitted Successfully'
                    : 'Issue Prefilled for Submission'
                  : 'Failed to Submit Feedback'}
              </Alert.Title>
              <Alert.Description>
                {submitResult.success
                  ? isGitHubConnected
                    ? 'An issue was opened on your behalf on GitHub.'
                    : 'GitHub page has been opened in your browser with your prefilled details.'
                  : submitResult.error || 'Please try again or submit directly on GitHub.'}
              </Alert.Description>
              {submitResult.success && (
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-2 sm:hidden font-semibold"
                  onPress={() => window.open(submitResult.url)}>
                  {isGitHubConnected ? 'View GitHub Issue' : 'Go to browser'}
                </Button>
              )}
            </Alert.Content>
            {submitResult.success && (
              <Button
                size="sm"
                variant="primary"
                className="hidden sm:block font-semibold"
                onPress={() => window.open(submitResult.url)}>
                {isGitHubConnected ? 'View GitHub Issue' : 'Go to browser'}
              </Button>
            )}
          </Alert>
        )}
      </div>
    </SettingsSection>
  );
});

DashboardReportIssue.displayName = 'DashboardReportIssue';

export default DashboardReportIssue;
