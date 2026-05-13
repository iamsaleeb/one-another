import { Suspense } from "react";
import { SessionProvider } from "./session-provider";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <SessionProvider>
        <div className="bg-background pt-safe pb-safe flex min-h-svh flex-col">
          {children}
        </div>
      </SessionProvider>
    </Suspense>
  );
}
