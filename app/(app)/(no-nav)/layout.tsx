import { Suspense } from "react";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";

export default function NoNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense>
        <NoNavShell />
      </Suspense>
      <main>{children}</main>
    </div>
  );
}

async function NoNavShell() {
  const session = await auth();
  return <TopNav user={session?.user} />;
}
