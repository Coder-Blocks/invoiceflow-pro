"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MedicalStockItem,
  MedicalStockRowInput,
  UploadMedicalBillResponse,
  SaveMedicalStockResponse,
  ListMedicalStockResponse,
} from "@/types/medical-stock";

type MedicalStockClientProps = {
  initialOrganizationId?: string;
};

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
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return "image";
  }
  return "unknown";
}

export default function MedicalStockClient({
  initialOrganizationId = "",
}: MedicalStockClientProps) {
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
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
    if (!organizationId) return;
    void fetchStockList();
  }, [organizationId]);

  useEffect(() => {
    if (!previewBill) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [previewBill]);

  async function fetchStockList() {
    if (!organizationId.trim()) return;

    setLoadingList(true);
    setError("");

    try {
      const query = new URLSearchParams({
        organizationId: organizationId.trim(),
        search: search.trim(),
        lowStockOnly: String(lowStockOnly),
        expiryOnly: String(expiryOnly),
      });

      const response = await fetch(`/api/medical-stock/list?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ListMedicalStockResponse & { message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch stock list.");
      }

      setStockItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock list.");
    } finally {
      setLoadingList(false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length === 1) return [emptyRow()];
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
    if (!organizationId.trim()) {
      setError("Please enter Organization ID before uploading.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");
    setSelectedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId.trim());

      const response = await fetch("/api/medical-stock/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadMedicalBillResponse & { message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Upload failed.");
      }

      setMessage(data.message);
      setSelectedBillId(data.bill.id);
      setCurrentBillUrl(data.bill.fileUrl);
      setCurrentBillMimeType(data.bill.mimeType);

      if (data.extractedRows.length > 0) {
        setRows(data.extractedRows);
        await downloadExcel(data.extractedRows, "medical-stock-uploaded-bill");
      } else {
        setRows((prev) =>
          prev.map((row) => ({
            ...row,
            billFileUrl: data.bill.fileUrl,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveStock() {
    if (!organizationId.trim()) {
      setError("Please enter Organization ID before saving.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        organizationId: organizationId.trim(),
        billId: selectedBillId || undefined,
        rows: rows.map((row) => ({
          ...row,
          billFileUrl: row.billFileUrl || currentBillUrl || null,
        })),
      };

      const response = await fetch("/api/medical-stock/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SaveMedicalStockResponse & { message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Save failed.");
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
    if (!organizationId.trim()) {
      setError("Please enter Organization ID before export.");
      return;
    }

    try {
      const response = await fetch("/api/medical-stock/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organizationId.trim(),
          rows: exportRows.map((row) => ({
            ...row,
            billFileUrl: row.billFileUrl || currentBillUrl || null,
          })),
          filename,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
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

  const filteredLocalRows = useMemo(() => {
    return rows;
  }, [rows]);

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

          <div className="w-full max-w-md">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Organization ID
            </label>
            <input
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="Enter organization ID"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-900"
            />
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
        <div className="xl:col-span-2 space-y-6">
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
                            placeholder="/uploads/medical-stock/file.pdf"
                          />
                          {(row.billFileUrl || currentBillUrl) && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBill({
                                  url: row.billFileUrl || currentBillUrl || "",
                                  mimeType: getFileType(row.billFileUrl || currentBillUrl || "") === "pdf"
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
              Auto-updates quantity for same medicine name and batch number.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (!organizationId.trim()) {
                setError("Please enter Organization ID before export.");
                return;
              }

              try {
                const query = new URLSearchParams({
                  organizationId: organizationId.trim(),
                });

                const response = await fetch(`/api/medical-stock/export?${query.toString()}`, {
                  method: "GET",
                });

                if (!response.ok) {
                  const data = (await response.json().catch(() => null)) as { message?: string } | null;
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
                <th className="px-3 py-3 font-semibold">Bill</th>
                <th className="px-3 py-3 font-semibold">Created Date</th>
                <th className="px-3 py-3 font-semibold">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    {loadingList ? "Loading stock..." : "No medical stock found."}
                  </td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-3 font-medium text-slate-900">{item.medicineName}</td>
                    <td className="px-3 py-3 text-slate-700">{item.batchNumber}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDateDisplay(item.expiryDate)}</td>
                    <td className="px-3 py-3 text-slate-700">{item.quantity}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(item.sellingPrice)}</td>
                    <td className="px-3 py-3 text-slate-700">{item.vendorName || "-"}</td>
                    <td className="px-3 py-3">
                      {item.billFileUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewBill({
                              url: item.billFileUrl || "",
                              mimeType:
                                getFileType(item.billFileUrl) === "pdf"
                                  ? "application/pdf"
                                  : "image/*",
                              title: item.medicineName,
                            })
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View Bill
                        </button>
                      ) : (
                        <span className="text-slate-400">No bill</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatDateDisplay(item.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item.isLowStock && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Low Stock
                          </span>
                        )}

                        {item.isExpired && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Expired
                          </span>
                        )}

                        {!item.isExpired && item.expiresIn30Days && (
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            Expires in {item.daysToExpiry} day(s)
                          </span>
                        )}

                        {!item.isLowStock && !item.isExpired && !item.expiresIn30Days && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Healthy
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <p className="text-sm text-slate-500">{previewBill.url}</p>
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
              {previewBill.mimeType === "application/pdf" || previewBill.url.toLowerCase().endsWith(".pdf") ? (
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