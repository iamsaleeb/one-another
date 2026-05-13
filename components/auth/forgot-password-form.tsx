"use client";

import { useCallback, useEffect, useState } from "react";
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
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import {
  sendPasswordResetOtpAction,
  resetPasswordAction,
} from "@/lib/actions/auth";

type Step = "email" | "reset";

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [step, setStep] = useState<Step>("email");
  const [pendingEmail, setPendingEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", newPassword: "", confirmNewPassword: "" },
  });

  const onEmailSubmit = emailForm.handleSubmit(async (data) => {
    await sendPasswordResetOtpAction(data.email);
    // Always transition — prevents email enumeration
    setPendingEmail(data.email);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep("reset");
  });

  const handleResend = useCallback(async () => {
    await sendPasswordResetOtpAction(pendingEmail);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    resetForm.resetField("otp");
  }, [pendingEmail, resetForm]);

  const onResetSubmit = resetForm.handleSubmit(async (data) => {
    const result = await resetPasswordAction(pendingEmail, data);
    if (result?.error) {
      resetForm.setError("root", { message: result.error });
      resetForm.resetField("otp");
    }
    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
        resetForm.setError(field as keyof ResetPasswordInput, {
          message: msgs[0],
        })
      );
    }
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        {step === "email" ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Forgot your password?</CardTitle>
              <CardDescription>
                Enter your email and we&apos;ll send you a verification code to
                reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={onEmailSubmit} noValidate>
                  <div className="grid gap-6">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="m@example.com"
                              disabled={emailForm.formState.isSubmitting}
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
                        : "Send code"}
                    </Button>
                    <div className="text-center text-sm">
                      <Link
                        href="/login"
                        className="hover:text-primary underline underline-offset-4"
                      >
                        Back to sign in
                      </Link>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Reset your password</CardTitle>
              <CardDescription>
                Enter the code sent to{" "}
                <span className="text-foreground font-medium">
                  {pendingEmail}
                </span>{" "}
                and choose a new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resetForm}>
                <form onSubmit={onResetSubmit} noValidate>
                  <div className="grid gap-6">
                    {resetForm.formState.errors.root && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {resetForm.formState.errors.root.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={resetForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center gap-2">
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              pattern={REGEXP_ONLY_DIGITS}
                              disabled={resetForm.formState.isSubmitting}
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
                    <FormField
                      control={resetForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              disabled={resetForm.formState.isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resetForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm new password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              disabled={resetForm.formState.isSubmitting}
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
                      disabled={resetForm.formState.isSubmitting}
                    >
                      {resetForm.formState.isSubmitting
                        ? "Resetting..."
                        : "Reset password"}
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
                  </div>
                </form>
              </Form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
