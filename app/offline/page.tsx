export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">You are offline</h1>
        <p className="mt-3 text-slate-600">
          Please reconnect to internet and try again. Cached pages may still work
          if already opened earlier.
        </p>
      </div>
    </div>
  );
}