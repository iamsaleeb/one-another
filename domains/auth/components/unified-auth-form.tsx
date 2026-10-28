"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  requestOtpSchema,
  otpSchema,
  type RequestOtpInput,
  type OtpInput,
} from "../validations/auth";
import { requestOtpAction, verifyOtpAction } from "../actions/auth";
import { SocialAuthButtons } from "./social-auth-buttons";

const RESEND_COOLDOWN = 60;

type Step = "email" | "otp";

function intentBannerText(intent: string, label: string): string | null {
  if (intent === "attend") return `One step away from attending ${label}`;
  if (intent === "register")
    return `One step away from registering for ${label}`;
  if (intent === "follow") return `One step away from following ${label}`;
  return null;
}

export function UnifiedAuthForm({
  className,
  devMode = false,
  intent: intentProp,
  label: labelProp,
  callbackUrl: callbackUrlProp,
  ...props
}: React.ComponentProps<"div"> & {
  devMode?: boolean;
  intent?: string;
  label?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const searchParamsObj = useSearchParams();
  const intent = intentProp ?? searchParamsObj.get("intent") ?? undefined;
  const label = labelProp ?? searchParamsObj.get("label") ?? undefined;
  const rawCallback =
    callbackUrlProp ?? searchParamsObj.get("callbackUrl") ?? undefined;
  const safeCallback =
    rawCallback?.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";
  const intentText = intent && label ? intentBannerText(intent, label) : null;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  const emailForm = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onEmailSubmit = emailForm.handleSubmit(async (data) => {
    const result = await requestOtpAction(data);
    if (result?.error) {
      emailForm.setError("root", { message: result.error });
      return;
    }
    setEmail(data.email);
    setCooldown(RESEND_COOLDOWN);
    setStep("otp");
  });

  const onOtpSubmit = otpForm.handleSubmit(async (data) => {
    const result = await verifyOtpAction(email, data.otp, rawCallback);
    if (result?.error) {
      otpForm.setError("root", { message: result.error });
      otpForm.resetField("otp");
      return;
    }
    // Server redirect (NEXT_REDIRECT) normally navigates before reaching here.
    // This fallback handles the rare case where it doesn't.
    router.push(safeCallback);
  });

  const handleResend = useCallback(async () => {
    setResendError(null);
    const result = await requestOtpAction({ email });
    if (result?.error) {
      setResendError(result.error);
    } else {
      setCooldown(RESEND_COOLDOWN);
      otpForm.resetField("otp");
    }
  }, [email, otpForm]);

  const handleBack = () => {
    setStep("email");
    otpForm.reset();
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {intentText && (
        <Alert>
          <AlertDescription className="text-center font-medium">
            {intentText}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        {step === "email" ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome</CardTitle>
              <CardDescription>Sign in or create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <FormProvider {...emailForm}>
                <form onSubmit={onEmailSubmit} noValidate>
                  <div className="grid gap-6">
                    {emailForm.formState.errors.root && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {emailForm.formState.errors.root.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Controller
                      control={emailForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            type="email"
                            placeholder="you@example.com"
                            disabled={emailForm.formState.isSubmitting}
                            autoComplete="email"
                            {...field}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={emailForm.formState.isSubmitting}
                    >
                      {emailForm.formState.isSubmitting
                        ? "Sending code..."
                        : "Continue"}
                    </Button>
                    <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs uppercase">
                      Or continue with
                    </FieldSeparator>
                    <SocialAuthButtons />
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to{" "}
                <span className="text-foreground font-medium">{email}</span>.
                Enter it below to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormProvider {...otpForm}>
                <form onSubmit={onOtpSubmit}>
                  <div className="grid gap-6">
                    {otpForm.formState.errors.root && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {otpForm.formState.errors.root.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    {resendError && (
                      <Alert variant="destructive">
                        <AlertDescription>{resendError}</AlertDescription>
                      </Alert>
                    )}
                    <Controller
                      control={otpForm.control}
                      name="otp"
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className="items-center gap-2 [&>*]:w-auto"
                        >
                          <InputOTP
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            maxLength={6}
                            pattern={REGEXP_ONLY_DIGITS}
                            disabled={otpForm.formState.isSubmitting}
                            onComplete={() => onOtpSubmit()}
                            {...field}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    {devMode && (
                      <Alert>
                        <AlertDescription className="text-center text-sm">
                          Dev environment — use code{" "}
                          <span className="font-mono font-bold">000000</span>
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={otpForm.formState.isSubmitting}
                    >
                      {otpForm.formState.isSubmitting
                        ? "Verifying..."
                        : "Verify"}
                    </Button>
                    <div className="text-muted-foreground text-center text-sm">
                      Didn&apos;t receive a code?{" "}
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleResend}
                        disabled={cooldown > 0}
                        className="text-muted-foreground hover:text-primary h-auto p-0 underline"
                      >
                        {cooldown > 0
                          ? `Resend in ${cooldown}s`
                          : "Resend code"}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-primary h-auto p-0 underline"
                    >
                      Use a different email
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </>
        )}
      </Card>
      <div className="text-center">
        <Button variant="link" size="sm" asChild>
          <Link href={safeCallback}>Continue browsing as guest</Link>
        </Button>
      </div>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By continuing, you agree to our{" "}
        <Link
          href="/terms"
          target="_blank"
          className="hover:text-primary underline underline-offset-4"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="hover:text-primary underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
