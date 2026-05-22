"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
} from "@/lib/validations/auth";
import { requestOtpAction, verifyOtpAction } from "@/lib/actions/auth";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

const RESEND_COOLDOWN = 60;

type Step = "email" | "otp";

function intentBannerText(intent: string, label: string): string {
  if (intent === "attend") return `One step away from attending ${label}`;
  if (intent === "register")
    return `One step away from registering for ${label}`;
  if (intent === "follow") return `One step away from following ${label}`;
  return "";
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
      {intent && label && (
        <Alert>
          <AlertDescription className="text-center font-medium">
            {intentBannerText(intent, label)}
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
              <Form {...emailForm}>
                <form onSubmit={onEmailSubmit} noValidate>
                  <div className="grid gap-6">
                    {emailForm.formState.errors.root && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {emailForm.formState.errors.root.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              disabled={emailForm.formState.isSubmitting}
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
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
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background text-muted-foreground px-2">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <SocialAuthButtons />
                  </div>
                </form>
              </Form>
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
              <Form {...otpForm}>
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
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center gap-2">
                          <FormControl>
                            <InputOTP
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
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
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={cooldown > 0}
                        className="hover:text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cooldown > 0
                          ? `Resend in ${cooldown}s`
                          : "Resend code"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-primary text-center text-sm underline underline-offset-4"
                    >
                      Use a different email
                    </button>
                  </div>
                </form>
              </Form>
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
