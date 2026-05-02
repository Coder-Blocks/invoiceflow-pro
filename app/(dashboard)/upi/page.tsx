"use client";

import { useState } from "react";

type ParsedData = {
  text: string;
  amount: number;
  upiRef: string;
  vendor: string;
  date: string;
  sourceType: string;
};

export default function UpiAutoEntryPage() {
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [notes, setNotes] = useState(""); // ✅ new notes state

  async function uploadFile(file: File) {
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (data.success) {
      setImageUrl(data.url);
      setParsed(null);
      setNotes(""); // reset notes on new upload
    } else {
      alert(data.error || "Upload failed");
    }

    setUploading(false);
  }

  async function runBrowserOCR() {
    if (!imageUrl) return;

    try {
      setOcrLoading(true);

      const Tesseract = await import("tesseract.js");

      const result = await Tesseract.recognize(imageUrl, "eng");
      const text = result.data.text || "";

      const parseRes = await fetch("/api/upi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const parseData = await parseRes.json();

      if (parseData.success) {
        // ✅ Map API response keys to frontend keys
        const mapped: ParsedData = {
          text: parseData.data.rawText || "",      // rawText → text
          amount: parseData.data.amount || 0,
          upiRef: parseData.data.upiRef || "",     // now comes correctly
          vendor: parseData.data.vendor || "",
          date: parseData.data.date || "",
          sourceType: "UPI_SCREENSHOT",
        };
        setParsed(mapped);
        // Optional: pre‑fill notes with something useful
        setNotes("Auto-detected from UPI screenshot");
      } else {
        alert(parseData.error || "Failed to parse OCR result");
      }
    } catch (error) {
      console.error("BROWSER_OCR_ERROR:", error);
      alert("Failed to run OCR on screenshot");
    } finally {
      setOcrLoading(false);
    }
  }

  async function saveAsExpense() {
    if (!parsed) return;

    try {
      setSaving(true);

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.vendor || "UPI Expense",
          amount: Number(parsed.amount || 0),
          vendor: parsed.vendor || "",
          notes: notes || "Auto-created from UPI screenshot", // ✅ use notes from input
          date: new Date().toISOString().slice(0, 10),
          fileUrl: imageUrl,
          parsedText: parsed.text,
          upiRef: parsed.upiRef,
          sourceType: "UPI_SCREENSHOT",
          cgst: 0,
          sgst: 0,
          igst: 0,
          gstRate: 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("UPI entry saved successfully");
      } else {
        alert(data.error || "Failed to save entry");
      }
    } catch (error) {
      console.error("SAVE_UPI_ENTRY_ERROR:", error);
      alert("Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">UPI Auto Entry</h1>
        <p className="mt-1 text-slate-600">
          Upload UPI screenshot and auto-create accounting entry.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />

        {uploading && <p className="text-sm text-blue-600">Uploading screenshot...</p>}

        {imageUrl && (
          <div className="space-y-4">
            <img
              src={imageUrl}
              alt="UPI screenshot"
              className="max-h-112.5 rounded-xl border"
            />

            <button
              onClick={runBrowserOCR}
              disabled={ocrLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {ocrLoading ? "Parsing..." : "Parse Screenshot"}
            </button>
          </div>
        )}
      </div>

      {parsed && (
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Detected Entry</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Receiver Name (Vendor / Paid to) */}
            <div className="rounded-lg border p-4">
              <p className="text-sm text-slate-500">Receiver (Paid to)</p>
              <p className="font-semibold text-slate-900">
                {parsed.vendor || "-"}
              </p>
            </div>

            {/* Amount */}
            <div className="rounded-lg border p-4">
              <p className="text-sm text-slate-500">Amount</p>
              <p className="text-lg font-semibold">
                ₹{Number(parsed.amount || 0).toFixed(2)}
              </p>
            </div>

            {/* Transaction ID (UPI Reference) */}
            <div className="rounded-lg border p-4">
              <p className="text-sm text-slate-500">Transaction ID (UTR)</p>
              <p className="font-semibold text-slate-900">
                {parsed.upiRef || "-"}
              </p>
            </div>

            {/* Date */}
            <div className="rounded-lg border p-4">
              <p className="text-sm text-slate-500">Date</p>
              <p className="font-semibold text-slate-900">
                {parsed.date || "-"}
              </p>
            </div>
          </div>

          {/* Notes input */}
          <div className="rounded-lg border p-4">
            <label className="text-sm text-slate-500 block mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Show OCR Text (fully visible now) */}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Show OCR text
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600">
              {parsed.text || "No OCR text available"}
            </pre>
          </details>

          <button
            onClick={saveAsExpense}
            disabled={saving}
            className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as Expense"}
          </button>
        </div>
      )}
    </div>
  );
}