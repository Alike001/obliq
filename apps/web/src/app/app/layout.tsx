import { AppShell } from "@/components/app-shell";
import { AuthenticationRequiredError, getTenantContext } from "@/lib/session";
import { redirect } from "next/navigation";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await getTenantContext();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError)
      redirect(
        getRuntimeSecurityConfig().deploymentMode === "pilot"
          ? "/pilot"
          : "/auth/login",
      );
    throw error;
  }
  return <AppShell>{children}</AppShell>;
}
