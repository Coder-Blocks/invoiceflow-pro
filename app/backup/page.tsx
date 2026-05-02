"use client";

import { useEffect, useState } from "react";

type BackupPreview = {
  app: string;
  version: string;
  exportedAt: string | null;
  counts: Record<string, number>;
};

type BackupLog = {
  id: string;
  type: string;
  fileName?: string | null;
  status: string;
  createdAt: string;
};

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupJson, setBackupJson] = useState<any>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [logs, setLogs] = useState<BackupLog[]>([]);

  // 🔄 Load Logs
  async function loadLogs() {
    try {
      const res = await fetch("/api/backup/logs", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  // 📥 DOWNLOAD BACKUP
  async function downloadBackup() {
    try {
      setLoading(true);

      const res = await fetch("/api/backup/export");
      const data = await res.json();

      if (!data.success) {
        alert("Backup failed");
        return;
      }

      const blob = new Blob(
        [JSON.stringify(data.backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `backup-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);

      alert("Backup downloaded");
      loadLogs();
    } catch (err) {
      alert("Error downloading backup");
    } finally {
      setLoading(false);
    }
  }

  // 📂 FILE SELECT
  async function handleFile(file?: File) {
    try {
      if (!file) return;

      setBackupFile(file);
      setPreview(null);

      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/backup/preview", {
        method: "POST",
        body: JSON.stringify({ backup: json }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!data.success) {
        alert("Invalid backup file");
        return;
      }

      setBackupJson(json);
      setPreview(data.preview);
    } catch (err) {
      alert("Invalid JSON file");
    }
  }

  // ♻️ RESTORE BACKUP
  async function restoreBackup() {
    if (!backupJson) return;

    const confirm = prompt('Type "RESTORE" to confirm');
    if (confirm !== "RESTORE") return;

    try {
      setRestoreLoading(true);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: JSON.stringify({
          backup: backupJson,
          confirmRestore: true,
          fileName: backupFile?.name,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!data.success) {
        alert("Restore failed");
        return;
      }

      alert("Restore successful");
      setPreview(null);
      setBackupFile(null);
      loadLogs();

      window.location.reload();
    } catch (err) {
      alert("Restore error");
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <p className="text-gray-500">Protect your business data</p>
      </div>

      {/* DOWNLOAD */}
      <div className="p-5 border rounded bg-white">
        <h2 className="font-semibold text-lg">Download Backup</h2>

        <button
          onClick={downloadBackup}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Processing..." : "Download Backup"}
        </button>
      </div>

      {/* RESTORE */}
      <div className="p-5 border rounded bg-white">
        <h2 className="font-semibold text-lg">Restore Backup</h2>

        <input
          type="file"
          className="mt-4"
          accept=".json"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* PREVIEW */}
        {preview && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Preview</h3>

            <p>Version: {preview.version}</p>
            <p>
              Exported:{" "}
              {preview.exportedAt
                ? new Date(preview.exportedAt).toLocaleString()
                : "-"}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {Object.entries(preview.counts).map(([k, v]) => (
                <div key={k} className="text-sm border p-2 rounded">
                  {k}: <b>{v}</b>
                </div>
              ))}
            </div>

            <button
              onClick={restoreBackup}
              disabled={restoreLoading}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              {restoreLoading ? "Restoring..." : "Restore"}
            </button>
          </div>
        )}
      </div>

      {/* LOGS */}
      <div className="p-5 border rounded bg-white">
        <h2 className="font-semibold text-lg">Backup History</h2>

        {logs.length === 0 ? (
          <p className="text-gray-500 mt-2">No logs</p>
        ) : (
          <div className="mt-3 space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border p-3 rounded flex justify-between">
                <div>
                  <p className="font-semibold">{log.type}</p>
                  <p className="text-sm text-gray-500">{log.fileName}</p>
                </div>

                <div className="text-right">
                  <p className={log.status === "SUCCESS" ? "text-green-600" : "text-red-600"}>
                    {log.status}
                  </p>
                  <p className="text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}