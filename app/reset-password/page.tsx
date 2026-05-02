import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white px-4">
          <div className="rounded-3xl border border-yellow-500/20 bg-zinc-900/60 p-8 text-yellow-400">
            Loading...
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}