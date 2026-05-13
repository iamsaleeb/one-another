export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background pt-safe pb-safe flex min-h-svh flex-col items-center justify-center px-6 md:px-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <span className="text-primary text-3xl font-bold tracking-tight">
          1Another
        </span>
        <span className="text-muted-foreground text-sm">
          Connect with your church community
        </span>
      </div>
      {children}
    </div>
  );
}
