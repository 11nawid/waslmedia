'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginWithPassword } from '@/lib/auth/client';
import { isVerificationError } from '@/lib/auth/verification';
import { getTurnstileClientConfig } from '@/lib/turnstile/config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useProgressRouter } from '@/hooks/use-progress-router';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginSchema = z.infer<typeof loginSchema>;
type LoginStep = 'providers' | 'email' | 'password';
const turnstileEnabled = getTurnstileClientConfig().enabled;
const EMPTY_HUMAN_CHECK = { token: null, answer: '', ready: false } as const;

const panelMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.24, ease: 'easeOut' as const },
};

export default function LoginPage() {
  const router = useProgressRouter();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('providers');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<'disabled' | 'loading' | 'ready' | 'failed'>(
    turnstileEnabled ? 'loading' : 'disabled',
  );
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [useBackupVerification, setUseBackupVerification] = useState(!turnstileEnabled);
  const [humanCheck, setHumanCheck] = useState<{ token: string | null; answer: string; ready: boolean }>(
    EMPTY_HUMAN_CHECK
  );
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
    getValues,
    setFocus,
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
  });

  const emailField = register('email');
  const passwordField = register('password');
  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  useEffect(() => {
    setFormMessage(null);
  }, [watchedEmail, watchedPassword, turnstileToken]);

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

  const showComingSoon = (provider: string) => {
    toast({
      title: `${provider} is coming soon`,
      description: 'Email and password sign-in is available right now.',
    });
  };

  const resetTurnstileVerification = () => {
    setTurnstileToken(null);
    setTurnstileStatus(turnstileEnabled ? 'loading' : 'disabled');
    setTurnstileResetSignal((value) => value + 1);
  };

  const switchToBackupVerification = () => {
    setFormMessage(null);
    setUseBackupVerification(true);
    setTurnstileToken(null);
    setHumanCheck(EMPTY_HUMAN_CHECK);
    setTurnstileResetSignal((value) => value + 1);
  };

  const switchToTurnstileVerification = () => {
    setFormMessage(null);
    setUseBackupVerification(false);
    setTurnstileToken(null);
    setHumanCheck(EMPTY_HUMAN_CHECK);
    resetTurnstileVerification();
  };

  const openEmailStep = () => {
    setFormMessage(null);
    setStep('email');
    window.setTimeout(() => {
      setFocus('email');
      emailInputRef.current?.focus();
    }, 0);
  };

  const goToPasswordStep = async () => {
    setFormMessage(null);
    const valid = await trigger('email');
    if (!valid) {
      return;
    }

    if (turnstileEnabled && !useBackupVerification) {
      resetTurnstileVerification();
    }

    setStep('password');
    window.setTimeout(() => {
      setFocus('password');
      passwordInputRef.current?.focus();
    }, 0);
  };

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    const verificationReady =
      turnstileStatus === 'failed' || turnstileStatus === 'disabled' ? humanCheck.ready : Boolean(turnstileToken);

    if (!verificationReady) {
      setFormMessage('Please complete the quick verification before logging in.');
      return;
    }

    setFormMessage(null);
    setLoading(true);
    try {
      await loginWithPassword(data.email, data.password, {
        turnstileToken,
        humanCheckToken: humanCheck.token,
        humanCheckAnswer: humanCheck.answer,
      });
      await refreshAuth();
      router.push('/');
    } catch (error: any) {
      if (isVerificationError(error.message)) {
        setTurnstileToken(null);
        setTurnstileResetSignal((value) => value + 1);
      }
      setFormMessage(
        isVerificationError(error.message)
          ? 'We could not verify that request. Please try the check again.'
          : 'Invalid email or password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const emailValue = getValues('email');
  const emailNextDisabled = !watchedEmail.trim() || Boolean(errors.email);
  const usingFallbackVerification = turnstileStatus === 'disabled' || useBackupVerification;
  const canOfferBackupVerification = turnstileEnabled && !usingFallbackVerification;
  const canRetryTurnstile = turnstileEnabled && usingFallbackVerification;
  const loginDisabled =
    loading ||
    !watchedPassword.trim() ||
    Boolean(errors.password) ||
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
              title="Log into your account"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="auth-copy-link">
                      Sign up
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <div className="space-y-3">
                <AuthProviderButton
                  label="Login with email"
                  icon={<Mail className="h-4 w-4" />}
                  onClick={openEmailStep}
                  primary
                />
                <AuthProviderButton
                  label="Login with Google"
                  icon={<GoogleMark />}
                  onClick={() => showComingSoon('Google login')}
                />
                <AuthProviderButton
                  label="Login with Azravibe"
                  icon={<AzravibeMark />}
                  onClick={() => showComingSoon('Azravibe login')}
                />
              </div>
            </AuthPanelFrame>
          </motion.div>
        ) : null}

        {step === 'email' ? (
          <motion.div key="email" {...panelMotion}>
            <AuthPanelFrame
              title="Log in with your email"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="auth-copy-link">
                      Sign up
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
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="auth-field"
                    {...emailField}
                    ref={(element) => {
                      emailField.ref(element);
                      emailInputRef.current = element;
                    }}
                  />
                  {errors.email ? <p className="auth-hint-error">{errors.email.message}</p> : null}
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
              title="Log in with your email"
              footer={
                <div className="space-y-4 text-center">
                  <p className="auth-copy-muted">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="auth-copy-link">
                      Sign up
                    </Link>
                  </p>
                  <AuthLegalNotice />
                </div>
              }
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className="auth-field-label">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        toast({
                          title: 'Password reset is not ready yet',
                          description: 'You can still sign in with your existing email and password.',
                        })
                      }
                      className="text-sm text-slate-500 transition hover:text-slate-800 dark:text-white/45 dark:hover:text-white/72"
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=""
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

                {usingFallbackVerification ? (
                  <HumanCheckWidget
                    action="login"
                    resetSignal={turnstileResetSignal}
                    onValueChange={setHumanCheck}
                    title="Backup verification"
                    description="Cloudflare verification is unavailable right now, so you can use this check instead."
                  />
                ) : (
                  <div className="space-y-3">
                    <TurnstileWidget
                      key={`login-turnstile-${turnstileResetSignal}-${step}`}
                      action="login"
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

                {formMessage ? <p className="auth-hint-error">{formMessage}</p> : null}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={loginDisabled}
                    className="auth-button-primary"
                  >
                    {loading ? 'Logging in...' : 'Login'}
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
              </form>
            </AuthPanelFrame>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthShell>
  );
}
