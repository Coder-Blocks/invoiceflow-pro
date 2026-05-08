"use client";

import { useEffect, useMemo, useState } from "react";
import SavedStockGroupedTable from "@/components/medical-stock/SavedStockGroupedTable";
import type {
  MedicalStockItem,
  MedicalStockRowInput,
  UploadMedicalBillResponse,
  SaveMedicalStockResponse,
  ListMedicalStockResponse,
} from "@/types/medical-stock";

type PreviewBill = {
  url: string;
  mimeType?: string;
  title?: string;
};

const emptyRow = (): MedicalStockRowInput => ({
  medicineName: "",
  batchNumber: "",
  expiryDate: "",
  quantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  vendorName: "",
  billFileUrl: null,
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateDisplay(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function getFileType(url: string | null | undefined) {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "pdf";
  if (
    lower.includes(".png") ||
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".webp")
  ) {
    return "image";
  }
  return "unknown";
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (!contentType.includes("application/json")) {
    throw new Error(text || "Server returned a non-JSON response.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Invalid JSON response received from server.");
  }
}

function isRowCompletelyEmpty(row: MedicalStockRowInput) {
  return !(
    String(row.medicineName || "").trim() ||
    String(row.batchNumber || "").trim() ||
    String(row.expiryDate || "").trim() ||
    Number(row.quantity || 0) > 0 ||
    Number(row.purchasePrice || 0) > 0 ||
    Number(row.sellingPrice || 0) > 0 ||
    String(row.vendorName || "").trim()
  );
}

export default function MedicalStockClient() {
  const [rows, setRows] = useState<MedicalStockRowInput[]>([emptyRow()]);
  const [stockItems, setStockItems] = useState<MedicalStockItem[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiryOnly, setExpiryOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [currentBillUrl, setCurrentBillUrl] = useState<string>("");
  const [currentBillMimeType, setCurrentBillMimeType] = useState<string>("");
  const [previewBill, setPreviewBill] = useState<PreviewBill | null>(null);

  useEffect(() => {
    void fetchStockList();
  }, []);

  useEffect(() => {
    if (!previewBill) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [previewBill]);

  async function fetchStockList() {
    setLoadingList(true);
    setError("");

    try {
      const query = new URLSearchParams({
        search: search.trim(),
        lowStockOnly: String(lowStockOnly),
        expiryOnly: String(expiryOnly),
      });

      const response = await fetch(`/api/medical-stock/list?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonSafely<ListMedicalStockResponse & { message?: string }>(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch stock list.");
      }

      setStockItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock list.");
    } finally {
      setLoadingList(false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { ...emptyRow(), billFileUrl: currentBillUrl || null }]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length === 1) {
        return [{ ...emptyRow(), billFileUrl: currentBillUrl || null }];
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateRow<K extends keyof MedicalStockRowInput>(
    index: number,
    key: K,
    value: MedicalStockRowInput[K],
  ) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return {
          ...row,
          [key]: value,
        };
      }),
    );
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setMessage("");
    setError("");
    setSelectedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/medical-stock/upload", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafely<UploadMedicalBillResponse & { message?: string }>(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Upload failed.");
      }

      setMessage(data.message);
setSelectedBillId(data.bill.id);
setCurrentBillUrl(data.bill.fileUrl);
setCurrentBillMimeType(data.bill.mimeType);

if (data.extractedRows.length > 0) {
  setRows(data.extractedRows);
  await fetchStockList();
} else {
  setRows([
    {
      ...emptyRow(),
      billFileUrl: data.bill.fileUrl,
    },
  ]);
}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveStock() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const validRows = rows
        .map((row) => ({
          ...row,
          billFileUrl: row.billFileUrl || currentBillUrl || null,
        }))
        .filter((row) => !isRowCompletelyEmpty(row));

      if (validRows.length === 0) {
        throw new Error("Please enter at least one medicine row before saving.");
      }

      const response = await fetch("/api/medical-stock/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billId: selectedBillId || undefined,
          rows: validRows,
        }),
      });

      const data = await readJsonSafely<SaveMedicalStockResponse & { message?: string }>(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Save failed.");
      }

      setMessage(data.message);
      setStockItems(data.items);
      setRows([emptyRow()]);
      setSelectedBillId("");
      setCurrentBillUrl("");
      setCurrentBillMimeType("");
      setSelectedFileName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadExcel(exportRows: MedicalStockRowInput[], filename: string) {
    try {
      const validRows = exportRows.filter((row) => !isRowCompletelyEmpty(row));

      if (validRows.length === 0) {
        throw new Error("Please enter at least one medicine row before downloading Excel.");
      }

      const response = await fetch("/api/medical-stock/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: validRows.map((row) => ({
            ...row,
            billFileUrl: row.billFileUrl || currentBillUrl || null,
          })),
          filename,
        }),
      });

      if (!response.ok) {
        const data = await readJsonSafely<{ message?: string }>(response);
        throw new Error(data?.message || "Export failed.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${filename}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  }

  const filteredLocalRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Medical Stock Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Upload bills, extract medicine rows safely, update stock automatically, and export Excel.
            </p>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Purchase Bill Upload</h2>
                <p className="text-sm text-slate-600">
                  Supported formats: PNG, JPG, JPEG, WEBP, PDF.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                {uploading ? "Uploading..." : "Upload Bill"}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleUpload(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-800">Selected File</div>
              <div className="mt-1">{selectedFileName || "No file selected yet."}</div>
            </div>

            {currentBillUrl && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewBill({
                      url: currentBillUrl,
                      mimeType: currentBillMimeType,
                      title: "Uploaded Bill Preview",
                    })
                  }
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View Bill
                </button>

                <button
                  type="button"
                  onClick={() => void downloadExcel(rows, "medical-stock-current-rows")}
                  className="rounded-2xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  Download Excel
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Manual Medicine Entry</h2>
                <p className="text-sm text-slate-600">
                  Edit extracted rows or add medicines manually if OCR/PDF parsing fails.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Add Row
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1200px] w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-700">
                    <th className="px-3 py-3 font-semibold">Medicine Name</th>
                    <th className="px-3 py-3 font-semibold">Batch Number</th>
                    <th className="px-3 py-3 font-semibold">Expiry Date</th>
                    <th className="px-3 py-3 font-semibold">Quantity</th>
                    <th className="px-3 py-3 font-semibold">Purchase Price</th>
                    <th className="px-3 py-3 font-semibold">Selling Price</th>
                    <th className="px-3 py-3 font-semibold">Vendor Name</th>
                    <th className="px-3 py-3 font-semibold">Bill URL</th>
                    <th className="px-3 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocalRows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-3">
                        <input
                          value={row.medicineName}
                          onChange={(e) => updateRow(index, "medicineName", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                          placeholder="Paracetamol"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          value={row.batchNumber}
                          onChange={(e) => updateRow(index, "batchNumber", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                          placeholder="B123"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="date"
                          value={row.expiryDate}
                          onChange={(e) => updateRow(index, "expiryDate", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(index, "quantity", Number(e.target.value || 0))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.purchasePrice}
                          onChange={(e) =>
                            updateRow(index, "purchasePrice", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.sellingPrice}
                          onChange={(e) =>
                            updateRow(index, "sellingPrice", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          value={row.vendorName}
                          onChange={(e) => updateRow(index, "vendorName", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                          placeholder="Vendor Name"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={row.billFileUrl || currentBillUrl || ""}
                            onChange={(e) => updateRow(index, "billFileUrl", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
                            placeholder="Bill file URL"
                          />
                          {(row.billFileUrl || currentBillUrl) && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBill({
                                  url: row.billFileUrl || currentBillUrl || "",
                                  mimeType:
                                    getFileType(row.billFileUrl || currentBillUrl || "") === "pdf"
                                      ? "application/pdf"
                                      : currentBillMimeType,
                                  title: "Bill Preview",
                                })
                              }
                              className="whitespace-nowrap rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Quick Filters</h2>

            <div className="mt-4 space-y-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine, batch, vendor"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                <span>Low Stock Only</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={expiryOnly}
                  onChange={(e) => setExpiryOnly(e.target.checked)}
                />
                <span>Expiry Warning Only</span>
              </label>

              <button
                type="button"
                onClick={() => void fetchStockList()}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {loadingList ? "Refreshing..." : "Refresh Stock List"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Summary</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current Editable Rows
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{rows.length}</div>
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-red-500">
                  Low Stock
                </div>
                <div className="mt-2 text-2xl font-bold text-red-700">
                  {stockItems.filter((item) => item.isLowStock).length}
                </div>
              </div>

              <div className="rounded-2xl bg-orange-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-orange-500">
                  Expiry Warning
                </div>
                <div className="mt-2 text-2xl font-bold text-orange-700">
                  {stockItems.filter((item) => item.isExpired || item.expiresIn30Days).length}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Saved Stock List</h2>
      <p className="text-sm text-slate-600">
        Same medicine is grouped. Different batch numbers are preserved. Price changes are shown in batch history.
      </p>
    </div>

    <button
      type="button"
      onClick={async () => {
        try {
          const response = await fetch("/api/medical-stock/export", {
            method: "GET",
          });

          if (!response.ok) {
            const data = await readJsonSafely<{ message?: string }>(response);
            throw new Error(data?.message || "Failed to export stock.");
          }

          const blob = await response.blob();
          const objectUrl = window.URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = objectUrl;
          anchor.download = "medical-stock-export.xlsx";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.URL.revokeObjectURL(objectUrl);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Export failed.");
        }
      }}
      className="rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
    >
      Export All Stock Excel
    </button>
  </div>

  <div className="mt-4">
    <SavedStockGroupedTable
      items={stockItems}
      onPreviewBill={(url, title) =>
        setPreviewBill({
          url,
          mimeType: url.toLowerCase().includes(".pdf") ? "application/pdf" : "image/*",
          title: title || "Bill Preview",
        })
      }
    />
  </div>
</section>

      <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <button
            type="button"
            onClick={() => void downloadExcel(rows, "medical-stock-manual-rows")}
            className="rounded-2xl border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            Download Excel
          </button>

          <button
            type="button"
            onClick={() => void handleSaveStock()}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving Stock..." : "Save Stock"}
          </button>
        </div>
      </div>

      {previewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {previewBill.title || "Bill Preview"}
                </h3>
                <p className="break-all text-sm text-slate-500">{previewBill.url}</p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewBill(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="h-[75vh] overflow-auto bg-slate-50 p-4">
              {previewBill.mimeType === "application/pdf" || previewBill.url.toLowerCase().includes(".pdf") ? (
                <iframe
                  src={previewBill.url}
                  title="PDF Preview"
                  className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <img
                    src={previewBill.url}
                    alt="Bill preview"
                    className="max-h-full max-w-full rounded-2xl border border-slate-200 bg-white object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}