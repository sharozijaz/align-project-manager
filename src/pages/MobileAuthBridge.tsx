import { useEffect, useMemo } from "react";

export function MobileAuthBridge() {
  const appUrl = useMemo(() => {
    const suffix = `${window.location.search || ""}${window.location.hash || ""}`;
    return `align://auth${suffix}`;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.replace(appUrl);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [appUrl]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#101012] p-6 text-center text-[#ededf0]">
      <div className="max-w-sm">
        <h1 className="text-3xl font-black">Opening Align</h1>
        <p className="mt-3 text-[#b4b4bc]">
          Your sign-in is complete. If the Android app does not open automatically, tap below.
        </p>
        <a
          href={appUrl}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#3563e9] px-6 font-bold text-white no-underline"
        >
          Open Align
        </a>
      </div>
    </main>
  );
}
