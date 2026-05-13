"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
  otpSchema,
  type OtpInput,
  type RegisterInput,
} from "@/lib/validations/auth";
import {
  verifyRegistrationOtpAction,
  registerAction,
} from "@/lib/actions/auth";

const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyEmailFormProps {
  email: string;
  password: string;
  registrationData: RegisterInput;
}

export function VerifyEmailForm({
  email,
  password,
  registrationData,
}: VerifyEmailFormProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendError, setResendError] = useState<string | null>(null);

  const form = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const { isSubmitting } = form.formState;

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await verifyRegistrationOtpAction(email, data.otp, password);
    if (result?.error) {
      form.setError("root", { message: result.error });
      form.resetField("otp");
    }
  });

  const handleResend = useCallback(async () => {
    setResendError(null);
    const result = await registerAction(registrationData);
    if (result?.error) {
      setResendError(result.error);
    } else {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      form.resetField("otp");
    }
  }, [registrationData, form]);

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to{" "}
          <span className="text-foreground font-medium">{email}</span>. Enter it
          below to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <div className="grid gap-6">
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
              {resendError && (
                <Alert variant="destructive">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        pattern={REGEXP_ONLY_DIGITS}
                        disabled={isSubmitting}
                        onComplete={() => onSubmit()}
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify email"}
              </Button>
              <div className="text-muted-foreground text-center text-sm">
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="hover:text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
