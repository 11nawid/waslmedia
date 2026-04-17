'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Eye, EyeOff, Mail, Upload, XCircle } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { debounce } from 'lodash';
import {
  AuthLegalNotice,
  AuthPanelFrame,
  AuthPanelSkeleton,
  AuthProviderButton,
  AuthShell,
  AzravibeMark,
  GoogleMark,
} from '@/components/auth/auth-shell';
import { HumanCheckWidget } from '@/components/auth/human-check-widget';
import { TurnstileWidget } from '@/components/auth/turnstile-widget';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import { registerWithPassword } from '@/lib/auth/client';
import { DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import { isVerificationError } from '@/lib/auth/verification';
import { getTurnstileClientConfig } from '@/lib/turnstile/config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useProgressRouter } from '@/hooks/use-progress-router';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  channelName: z.string().min(3, { message: 'Channel name must be at least 3 characters.' }),
  handle: z
    .string()
    .min(3, { message: 'Handle must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Handle can only contain letters, numbers, and underscores.' }),
  profilePicture: z.instanceof(File).optional(),
});

type SignupSchema = z.infer<typeof signupSchema>;
type SignupStep = 'providers' | 'email' | 'password' | 'details';
const turnstileEnabled = getTurnstileClientConfig().enabled;
const EMPTY_HUMAN_CHECK = { token: null, answer: '', ready: false } as const;

const panelMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.24, ease: 'easeOut' as const },
};

export default function SignupPage() {
  const router = useProgressRouter();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const channelNameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestEmailCheckRef = useRef('');
  const latestHandleCheckRef = useRef('');

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<SignupStep>('providers');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [emailCheckState, setEmailCheckState] = useState<'idle' | 'checking' | 'error'>('idle');
  const [handleCheckState, setHandleCheckState] = useState<'idle' | 'checking' | 'error'>('idle');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<'disabled' | 'loading' | 'ready' | 'failed'>(
    turnstileEnabled ? 'loading' : 'disabled',
  );
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [useBackupVerification, setUseBackupVerification] = useState(!turnstileEnabled);
  const [humanCheck, setHumanCheck] = useState<{ token: string | null; answer: string; ready: boolean }>(
    EMPTY_HUMAN_CHECK
  );
  const [emailStepMessage, setEmailStepMessage] = useState<string | null>(null);
  const [detailsStepMessage, setDetailsStepMessage] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues,
    setFocus,
  } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      channelName: '',
      handle: '',
    },
    mode: 'onChange',
  });

  const emailField = register('email');
  const passwordField = register('password');
  const channelNameField = register('channelName');
  const handleField = register('handle');

  const showComingSoon = (provider: string) => {
    toast({
      title: `${provider} is coming soon`,
      description: 'You can create an account with email and password right now.',
    });
  };

  const resetTurnstileVerification = () => {
    setTurnstileToken(null);
    setTurnstileStatus(turnstileEnabled ? 'loading' : 'disabled');
    setTurnstileResetSignal((value) => value + 1);
  };

  const switchToBackupVerification = () => {
    setDetailsStepMessage(null);
    setUseBackupVerification(true);
    setTurnstileToken(null);
    setHumanCheck(EMPTY_HUMAN_CHECK);
    setTurnstileResetSignal((value) => value + 1);
  };

  const switchToTurnstileVerification = () => {
    setDetailsStepMessage(null);
    setUseBackupVerification(false);
    setTurnstileToken(null);
    setHumanCheck(EMPTY_HUMAN_CHECK);
    resetTurnstileVerification();
  };

  const openEmailStep = () => {
    setStep('email');
    window.setTimeout(() => {
      setFocus('email');
      emailInputRef.current?.focus();
    }, 0);
  };

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');
  const watchedChannelName = watch('channelName');
  const watchedHandle = watch('handle');

  const checkEmail = useCallback(async (email: string) => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      latestEmailCheckRef.current = '';
      setEmailAvailable(null);
      setEmailCheckState('idle');
      return null;
    }

    if (!signupSchema.shape.email.safeParse(normalizedEmail).success) {
      latestEmailCheckRef.current = '';
      setEmailAvailable(null);
      setEmailCheckState('idle');
      return null;
    }

    latestEmailCheckRef.current = normalizedEmail;
    setEmailCheckState('checking');

    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
      const payload = await response.json();
      const available = Boolean(payload.available);
      if (latestEmailCheckRef.current !== normalizedEmail) {
        return available;
      }
      setEmailAvailable(available);
      setEmailCheckState('idle');
      return available;
    } catch {
      if (latestEmailCheckRef.current !== normalizedEmail) {
        return null;
      }
      setEmailAvailable(null);
      setEmailCheckState('error');
      return null;
    }
  }, []);

  const checkHandle = useCallback(async (handle: string) => {
    const normalizedHandle = handle.trim();

    if (!normalizedHandle || normalizedHandle.length < 3) {
      latestHandleCheckRef.current = '';
      setHandleAvailable(null);
      setHandleCheckState('idle');
      return null;
    }

    if (!signupSchema.shape.handle.safeParse(normalizedHandle).success) {
      latestHandleCheckRef.current = '';
      setHandleAvailable(null);
      setHandleCheckState('idle');
      return null;
    }

    latestHandleCheckRef.current = normalizedHandle;
    setHandleCheckState('checking');

    try {
      const response = await fetch(`/api/auth/check-handle?handle=${encodeURIComponent(normalizedHandle)}`);
      const payload = await response.json();
      const available = Boolean(payload.available);
      if (latestHandleCheckRef.current !== normalizedHandle) {
        return available;
      }
      setHandleAvailable(available);
      setHandleCheckState('idle');
      return available;
    } catch {
      if (latestHandleCheckRef.current !== normalizedHandle) {
        return null;
      }
      setHandleAvailable(null);
      setHandleCheckState('error');
      return null;
    }
  }, []);

  const debouncedCheckEmail = useMemo(
    () =>
      debounce((email: string) => {
        void checkEmail(email);
      }, 500),
    [checkEmail],
  );
  const debouncedCheckHandle = useMemo(
    () =>
      debounce((handle: string) => {
        void checkHandle(handle);
      }, 500),
    [checkHandle],
  );

  useEffect(() => {
    if (!watchedEmail.trim() || errors.email) {
      debouncedCheckEmail.cancel();
      setEmailAvailable(null);
      setEmailCheckState('idle');
      return;
    }

    setEmailStepMessage(null);
    debouncedCheckEmail(watchedEmail);
  }, [watchedEmail, errors.email, debouncedCheckEmail]);

  useEffect(() => {
    if (!watchedHandle.trim() || errors.handle) {
      debouncedCheckHandle.cancel();
      setHandleAvailable(null);
      setHandleCheckState('idle');
      return;
    }

    setDetailsStepMessage(null);
    debouncedCheckHandle(watchedHandle);
  }, [watchedHandle, errors.handle, debouncedCheckHandle]);

  useEffect(() => {
    return () => {
      debouncedCheckEmail.cancel();
      debouncedCheckHandle.cancel();
    };
  }, [debouncedCheckEmail, debouncedCheckHandle]);

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  useEffect(() => {
    setEmailStepMessage(null);
  }, [watchedEmail]);

  useEffect(() => {
    setDetailsStepMessage(null);
  }, [watchedChannelName, watchedHandle, turnstileToken]);

  useEffect(() => {
    if (turnstileStatus === 'disabled') {
      setUseBackupVerification(true);
    }
  }, [turnstileStatus]);

  useEffect(() => {
    let frameA = 0;
    let frameB = 0;

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        setPageReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, []);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) {
      return;
    }

    const file = event.target.files[0];
    setValue('profilePicture', file, { shouldValidate: true });
    setProfilePreview(URL.createObjectURL(file));
  };

  const goToPasswordStep = async () => {
    setEmailStepMessage(null);
    const valid = await trigger('email');
    if (!valid) {
      return;
    }

    const available = await checkEmail(getValues('email'));
    if (available === false) {
      setEmailStepMessage('That email already has an account. Try signing in instead.');
      return;
    }

    if (available === null) {
      setEmailStepMessage('We could not verify that email right now. Please try again.');
      return;
    }

    setStep('password');
    window.setTimeout(() => {
      setFocus('password');
      passwordInputRef.current?.focus();
    }, 0);
  };

  const goToDetailsStep = async () => {
    const valid = await trigger('password');
    if (!valid) {
      return;
    }

    if (turnstileEnabled && !useBackupVerification) {
      resetTurnstileVerification();
    }

    setStep('details');
    window.setTimeout(() => {
      setFocus('channelName');
      channelNameInputRef.current?.focus();
    }, 0);
  };

  const onSubmit: SubmitHandler<SignupSchema> = async (data) => {
    setDetailsStepMessage(null);
    const valid = await trigger(['channelName', 'handle']);
    if (!valid) {
      return;
    }

    const available = await checkHandle(data.handle);
    if (available === false) {
      setDetailsStepMessage('That handle is already taken. Choose another one.');
      return;
    }

    if (available === null) {
      setDetailsStepMessage('We could not verify your handle right now. Please try again.');
      return;
    }

    const verificationReady =
      turnstileStatus === 'failed' || turnstileStatus === 'disabled' ? humanCheck.ready : Boolean(turnstileToken);

    if (!verificationReady) {
      setDetailsStepMessage('Please complete the quick verification before creating your account.');
      return;
    }

    setLoading(true);

    try {
      let photoURL = DEFAULT_PROFILE_PICTURE;

      if (data.profilePicture) {
        const file = data.profilePicture;
        const filePath = `pending/${Date.now()}_${sanitizeFileName(file.name)}`;
        const uploadResult = await uploadFileToStorage({
          bucket: 'profile',
          objectKey: filePath,
          file,
          intentScope: 'signup-profile',
        });
        photoURL = uploadResult.storageRef;
      }

      await registerWithPassword({
        email: data.email,
        password: data.password,
        channelName: data.channelName,
        handle: data.handle,
        photoURL,
        turnstileToken,
        humanCheckToken: humanCheck.token,
        humanCheckAnswer: humanCheck.answer,
      });
      await refreshAuth();
      router.push('/signup/success');
    } catch (error: any) {
      const message =
        error.message === 'EMAIL_ALREADY_EXISTS'
          ? 'This email address is already in use.'
          : error.message === 'HANDLE_ALREADY_EXISTS'
            ? 'This handle is already in use.'
            : isVerificationError(error.message)
              ? 'We could not verify that request. Please try the check again.'
            : error.message === 'UNAUTHORIZED'
              ? 'We could not prepare your profile upload right now. Please try again.'
              : 'An unexpected error occurred. Please try again.';

      setDetailsStepMessage(message);
      if (isVerificationError(error.message)) {
        setTurnstileToken(null);
        setTurnstileResetSignal((value) => value + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const emailValue = watchedEmail;
  const emailHelperMessage =
    errors.email?.message ||
    emailStepMessage ||
    (emailCheckState === 'checking'
      ? 'Checking whether this email is available...'
      : emailAvailable === true
        ? 'This email is available.'
        : emailAvailable === false
          ? 'That email already has an account.'
          : emailCheckState === 'error'
            ? 'We could not verify this email right now.'
            : null);
  const emailHelperTone =
    errors.email || emailStepMessage || emailAvailable === false || emailCheckState === 'error'
      ? 'auth-hint-error'
      : emailAvailable === true
        ? 'auth-hint-success'
        : 'auth-hint-muted';
  const handleHelperMessage =
    errors.handle?.message ||
    (handleCheckState === 'checking'
      ? 'Checking whether this handle is available...'
      : handleAvailable === true
        ? 'This handle is available.'
        : handleAvailable === false
          ? 'That handle is already taken.'
          : handleCheckState === 'error'
            ? 'We could not verify this handle right now.'
            : null);
  const handleHelperTone =
    errors.handle || handleAvailable === false || handleCheckState === 'error'
      ? 'auth-hint-error'
      : handleAvailable === true
        ? 'auth-hint-success'
        : 'auth-hint-muted';
  const emailNextDisabled = !watchedEmail.trim() || Boolean(errors.email) || emailCheckState === 'checking';
  const passwordNextDisabled = !watchedPassword.trim() || Boolean(errors.password);
  const usingFallbackVerification = turnstileStatus === 'disabled' || useBackupVerification;
  const canOfferBackupVerification = turnstileEnabled && !usingFallbackVerification;
  const canRetryTurnstile = turnstileEnabled && usingFallbackVerification;
  const createAccountDisabled =
    loading ||
    !watchedChannelName.trim() ||
    !watchedHandle.trim() ||
    Boolean(errors.channelName) ||
    Boolean(errors.handle) ||
    handleCheckState === 'checking' ||
    handleAvailable !== true ||
    (usingFallbackVerification ? !humanCheck.ready : turnstileEnabled && !turnstileToken);

  if (!pageReady) {
    return (
      <AuthShell>
        <AuthPanelSkeleton titleWidth="w-72" />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AnimatePresence mode="wait">
        {step === 'providers' ? (
          <motion.div key="providers" {...panelMotion}>
            <AuthPanelFrame
              title="Create your account"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-copy-link">
                      Sign in
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <div className="space-y-3">
                <AuthProviderButton
                  label="Sign up with email"
                  icon={<Mail className="h-4 w-4" />}
                  onClick={openEmailStep}
                  primary
                />
                <AuthProviderButton
                  label="Sign up with Google"
                  icon={<GoogleMark />}
                  onClick={() => showComingSoon('Google signup')}
                />
                <AuthProviderButton
                  label="Sign up with Azravibe"
                  icon={<AzravibeMark />}
                  onClick={() => showComingSoon('Azravibe signup')}
                />
              </div>
            </AuthPanelFrame>
          </motion.div>
        ) : null}

        {step === 'email' ? (
          <motion.div key="email" {...panelMotion}>
            <AuthPanelFrame
              title="Create your account"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-copy-link">
                      Sign in
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="auth-field-label">
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="auth-field pr-11"
                      {...emailField}
                      ref={(element) => {
                        emailField.ref(element);
                        emailInputRef.current = element;
                      }}
                    />
                    {emailAvailable === true ? (
                      <CheckCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 dark:text-emerald-300" />
                    ) : null}
                    {emailAvailable === false ? (
                      <XCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500 dark:text-rose-300" />
                    ) : null}
                  </div>
                  {emailHelperMessage ? <p className={emailHelperTone}>{emailHelperMessage}</p> : null}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={goToPasswordStep}
                    disabled={emailNextDisabled}
                    className="auth-button-primary"
                  >
                    Next
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('providers')}
                    className="auth-button-secondary"
                  >
                    Go back
                  </Button>
                </div>
              </div>
            </AuthPanelFrame>
          </motion.div>
        ) : null}

        {step === 'password' ? (
          <motion.div key="password" {...panelMotion}>
            <AuthPanelFrame
              title="Create your account"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-copy-link">
                      Sign in
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="auth-field-label">Email</Label>
                  <Input
                    value={emailValue}
                    readOnly
                    disabled
                    className="auth-field-readonly"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="auth-field-label">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-field pr-12"
                      {...passwordField}
                      ref={(element) => {
                        passwordField.ref(element);
                        passwordInputRef.current = element;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800 dark:text-white/45 dark:hover:text-white/75"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password ? <p className="auth-hint-error">{errors.password.message}</p> : null}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={goToDetailsStep}
                    disabled={passwordNextDisabled}
                    className="auth-button-primary"
                  >
                    Next
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('email')}
                    className="auth-button-secondary"
                  >
                    Go back
                  </Button>
                </div>
              </div>
            </AuthPanelFrame>
          </motion.div>
        ) : null}

        {step === 'details' ? (
          <motion.div key="details" {...panelMotion}>
            <AuthPanelFrame
              title="Set up your channel"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-copy-link">
                      Sign in
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="auth-soft-card flex items-center gap-4 p-4">
                  <Avatar className="h-20 w-20 rounded-3xl border border-slate-200 dark:border-white/10">
                    <AvatarImage src={profilePreview || DEFAULT_PROFILE_PICTURE} alt="Profile preview" />
                    <AvatarFallback className="bg-slate-200 text-lg text-slate-900 dark:bg-white/10 dark:text-white">
                      {watchedChannelName?.trim()?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Profile photo</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">Optional for now. You can upload one later too.</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 rounded-full border-slate-200 bg-white/70 text-slate-900 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload image
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelName" className="auth-field-label">
                    Channel name
                  </Label>
                  <Input
                    id="channelName"
                    placeholder="Your channel"
                    className="auth-field"
                    {...channelNameField}
                    ref={(element) => {
                      channelNameField.ref(element);
                      channelNameInputRef.current = element;
                    }}
                  />
                  {errors.channelName ? <p className="auth-hint-error">{errors.channelName.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="handle" className="auth-field-label">
                    Handle
                  </Label>
                  <div className="relative">
                    <Input
                      id="handle"
                      placeholder="yourhandle"
                      className="auth-field pr-11"
                      {...handleField}
                    />
                    {handleAvailable === true ? (
                      <CheckCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 dark:text-emerald-300" />
                    ) : null}
                    {handleAvailable === false ? (
                      <XCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500 dark:text-rose-300" />
                    ) : null}
                  </div>
                  {handleHelperMessage ? <p className={handleHelperTone}>{handleHelperMessage}</p> : null}
                </div>

                {usingFallbackVerification ? (
                  <HumanCheckWidget
                    action="signup"
                    resetSignal={turnstileResetSignal}
                    onValueChange={setHumanCheck}
                    title="Backup verification"
                    description="Cloudflare verification is unavailable right now, so you can use this check instead."
                  />
                ) : (
                  <div className="space-y-3">
                    <TurnstileWidget
                      key={`signup-turnstile-${turnstileResetSignal}-${step}`}
                      action="signup"
                      resetSignal={turnstileResetSignal}
                      onTokenChange={setTurnstileToken}
                      onStatusChange={setTurnstileStatus}
                    />
                    {canOfferBackupVerification ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={switchToBackupVerification}
                        className="w-full"
                      >
                        Try another way
                      </Button>
                    ) : null}
                  </div>
                )}

                {canRetryTurnstile ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={switchToTurnstileVerification}
                    className="w-full"
                  >
                    Use Cloudflare verification instead
                  </Button>
                ) : null}

                {detailsStepMessage ? <p className="auth-hint-error">{detailsStepMessage}</p> : null}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={createAccountDisabled}
                    className="auth-button-primary"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('password')}
                    className="auth-button-secondary"
                  >
                    Go back
                  </Button>
                </div>
              </form>
            </AuthPanelFrame>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthShell>
  );
}
