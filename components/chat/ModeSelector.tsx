"use client";

type Mode = "single" | "team";
type SingleModelKey = "aiwoven";

export function ModeSelector({
  mode,
  setMode,
  singleModelKey,
  setSingleModelKey,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  singleModelKey: SingleModelKey;
  setSingleModelKey: (k: SingleModelKey) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Chat Mode</div>

      <div className="mt-2 flex gap-2">
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            mode === "single" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setMode("single")}
        >
          Single
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            mode === "team" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setMode("team")}
        >
          Multi-step workflow
        </button>
      </div>

      {mode === "single" ? (
        <div className="mt-3">
          <div className="text-xs text-gray-500">Direct chat uses the standard workspace quota.</div>
          <select
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            value={singleModelKey}
            onChange={(e) => setSingleModelKey(e.target.value as any)}
          >
            <option value="aiwoven">AIWoven Assistant</option>
          </select>
          <div className="mt-2 text-xs text-amber-700">
            AIWoven automatically routes requests and handles service fallback.
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-600">
          Multi-step mode plans, drafts, and reviews before answering. This mode consumes chat quota.
        </div>
      )}
    </div>
  );
}
