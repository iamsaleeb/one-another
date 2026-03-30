export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 pt-safe pb-safe md:px-10">
      <div className="flex flex-col items-center gap-2 mb-6">
        <span className="text-3xl font-bold tracking-tight text-primary">
          1Another
        </span>
        <span className="text-sm text-muted-foreground">
          Connect with your church community
        </span>
      </div>
      {children}
    </div>
  )
}
