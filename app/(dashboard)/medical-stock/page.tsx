"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type MedicineRow = {
  id: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number | string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  vendorName: string;
  billFileUrl?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  pack?: string;
  mrp?: number | string;
  gstPercent?: number | string;
  discountPercent?: number | string;
  value?: number | string;
};

type SavedItem = {
  id?: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl?: string | null;
  createdAt?: string;
};

const LOW_STOCK_THRESHOLD = 10;

// IMPORTANT: ikkada mee real organization id pettaali
const ORGANIZATION_ID = "cmoos5qty0001l704xbn7jhx6";

// CHANGED: empty row final structure
const createEmptyRow = (): MedicineRow => ({
  id: crypto.randomUUID(),
  medicineName: "",
  batchNumber: "",
  expiryDate: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
  vendorName: "",
  billFileUrl: "",
  invoiceNumber: "",
  invoiceDate: "",
  pack: "",
  mrp: "",
  gstPercent: "",
  discountPercent: "",
  value: "",
});

function toNumber(value: string | number) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

// CHANGED: mobile/view bill fix kosam file ni persistent data url ga convert chestham
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isExpired(expiryDate: string) {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const now = new Date();
  exp.setHours(23, 59, 59, 999);
  return exp.getTime() < now.getTime();
}

function isExpiringSoon(expiryDate: string, days = 30) {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  exp.setHours(23, 59, 59, 999);
  return exp.getTime() >= now.getTime() && exp.getTime() <= future.getTime();
}

function openBillUrl(url?: string | null) {
  if (!url) return;
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!newWindow) {
    window.location.href = url;
  }
}

function sanitizeRows(rows: MedicineRow[], fallbackBillUrl?: string) {
  return rows
    .map((row) => ({
      medicineName: row.medicineName.trim(),
      batchNumber: row.batchNumber.trim(),
      expiryDate: row.expiryDate,
      quantity: toNumber(row.quantity),
      purchasePrice: toNumber(row.purchasePrice),
      sellingPrice: toNumber(row.sellingPrice),
      vendorName: row.vendorName.trim(),
      billFileUrl: row.billFileUrl || fallbackBillUrl || "",
      invoiceNumber: row.invoiceNumber || "",
      invoiceDate: row.invoiceDate || "",
      pack: row.pack || "",
      mrp: toNumber(row.mrp || 0),
      gstPercent: toNumber(row.gstPercent || 0),
      discountPercent: toNumber(row.discountPercent || 0),
      value: toNumber(row.value || 0),
    }))
    .filter(
      (row) =>
        row.medicineName ||
        row.batchNumber ||
        row.expiryDate ||
        row.quantity > 0 ||
        row.purchasePrice > 0 ||
        row.sellingPrice > 0 ||
        row.vendorName
    );
}

export default function MedicalStockPage() {
  const [rows, setRows] = useState<MedicineRow[]>([createEmptyRow()]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [billFileUrl, setBillFileUrl] = useState("");
  const [billFileKind, setBillFileKind] = useState<"image" | "pdf" | "unknown">("unknown");
  const [lastUploadName, setLastUploadName] = useState("");
  const [parseStatus, setParseStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const warnings = useMemo(() => {
    return rows.map((row) => {
      const qty = toNumber(row.quantity);
      return {
        lowStock: qty > 0 && qty < LOW_STOCK_THRESHOLD,
        expired: isExpired(row.expiryDate),
        expiringSoon: !isExpired(row.expiryDate) && isExpiringSoon(row.expiryDate),
      };
    });
  }, [rows]);

  // CHANGED: list fetch same organization id tho chestham
  const fetchSavedItems = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(
        `/api/medical-stock/list?organizationId=${ORGANIZATION_ID}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch stock list");
      }

      setSavedItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch stock list");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const handleRowChange = (
    id: string,
    field: keyof MedicineRow,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...createEmptyRow(), billFileUrl }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      if (prev.length === 1) return [createEmptyRow()];
      return prev.filter((row) => row.id !== id);
    });
  };

  // CHANGED: parsed rows ki direct persistent bill url attach chestham
  const replaceRowsWithParsedOrKeepManual = (
    parsedItems: Partial<MedicineRow>[],
    url: string
  ) => {
    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      const parsedRows: MedicineRow[] = parsedItems.map((item) => ({
        id: crypto.randomUUID(),
        medicineName: item.medicineName || "",
        batchNumber: item.batchNumber || "",
        expiryDate: item.expiryDate || "",
        quantity: item.quantity ?? "",
        purchasePrice: item.purchasePrice ?? "",
        sellingPrice: item.sellingPrice ?? "",
        vendorName: item.vendorName || "",
        billFileUrl: url,
        invoiceNumber: item.invoiceNumber || "",
        invoiceDate: item.invoiceDate || "",
        pack: item.pack || "",
        mrp: item.mrp ?? "",
        gstPercent: item.gstPercent ?? "",
        discountPercent: item.discountPercent ?? "",
        value: item.value ?? "",
      }));
      setRows(parsedRows);
      return parsedRows;
    }

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        billFileUrl: url,
      }))
    );
    return null;
  };

  const downloadExcel = async (excelBase64?: string, excelFileName?: string) => {
    if (!excelBase64) return;

    const binary = atob(excelBase64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = excelFileName || `medical-stock-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // CHANGED: mobile upload + persistent data url save
  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    setMessage("");
    setParseStatus("");

    try {
      const dataUrl = await fileToDataUrl(file);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/medical-stock/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      const parsedItems = Array.isArray(data?.parsedItems) ? data.parsedItems : [];
      const fileKind = data?.fileKind || "unknown";
      const excelBase64 = data?.excelBase64 || "";
      const excelFileName = data?.excelFileName || "";

      setBillFileUrl(dataUrl);
      setBillFileKind(fileKind);
      setLastUploadName(file.name);
      setParseStatus(data?.message || "Bill uploaded successfully.");

      replaceRowsWithParsedOrKeepManual(parsedItems, dataUrl);

      await downloadExcel(excelBase64, excelFileName);

      setMessage(
        parsedItems.length > 0
          ? "Bill uploaded, medicines parsed, and Excel downloaded successfully."
          : "Bill uploaded safely. OCR finished, but no medicine rows could be parsed."
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // CHANGED: save same organization id tho chestham
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const cleanRows = sanitizeRows(rows, billFileUrl);

      if (cleanRows.length === 0) {
        throw new Error("Please add at least one medicine row before saving.");
      }

      const res = await fetch("/api/medical-stock/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: ORGANIZATION_ID,
          items: cleanRows.map((row: any) => ({
            ...row,
            unitType: row.pack || "UNIT",
            lowStockThreshold: 10,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save stock");
      }

      setMessage(`Medical stock saved successfully. ${data?.count || 0} rows saved.`);
      await fetchSavedItems();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save stock");
    } finally {
      setSaving(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUpload(file);
  };

  const handleManualExcelDownload = () => {
    const usableRows = sanitizeRows(rows, billFileUrl);

    const exportRows =
      usableRows.length > 0
        ? usableRows.map((row: any) => ({
            "Vendor Name": row.vendorName || "",
            "Invoice Number": row.invoiceNumber || "",
            "Invoice Date": row.invoiceDate || "",
            "Medicine Name": row.medicineName,
            Pack: row.pack || "",
            "Batch Number": row.batchNumber,
            "Expiry Date": row.expiryDate,
            Quantity: row.quantity,
            MRP: row.mrp || "",
            "Purchase Price": row.purchasePrice,
            "Selling Price": row.sellingPrice,
            "GST %": row.gstPercent || "",
            "Discount %": row.discountPercent || "",
            Value: row.value || "",
            "Bill File URL": row.billFileUrl || "",
          }))
        : [
            {
              "Vendor Name": "",
              "Invoice Number": "",
              "Invoice Date": "",
              "Medicine Name": "",
              Pack: "",
              "Batch Number": "",
              "Expiry Date": "",
              Quantity: "",
              MRP: "",
              "Purchase Price": "",
              "Selling Price": "",
              "GST %": "",
              "Discount %": "",
              Value: "",
              "Bill File URL": billFileUrl || "",
            },
          ];

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medical Stock");
    XLSX.writeFile(workbook, `medical-stock-${Date.now()}.xlsx`);
  };

  const previewBlock = useMemo(() => {
    if (!billFileUrl) return null;

    if (billFileKind === "pdf") {
      return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">PDF Bill Preview</h3>

            {/* CHANGED: anchor badulu button use chesanu */}
            <button
              type="button"
              onClick={() => openBillUrl(billFileUrl)}
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View Uploaded Bill
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <iframe
              src={billFileUrl}
              title="PDF Preview"
              className="h-[500px] w-full bg-white"
            />
          </div>
        </div>
      );
    }

    if (billFileKind === "image") {
      return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Image Bill Preview</h3>

            {/* CHANGED: anchor badulu button use chesanu */}
            <button
              type="button"
              onClick={() => openBillUrl(billFileUrl)}
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View Uploaded Bill
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
            <img
              src={billFileUrl}
              alt="Uploaded Bill"
              className="max-h-[500px] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      );
    }

    return null;
  }, [billFileKind, billFileUrl]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold md:text-3xl">Medical Stock Module</h1>
        <p className="mt-2 text-sm text-cyan-50 md:text-base">
          Manual medicine stock entry, bill upload, safe PDF/image preview, low stock
          alerts, expiry alerts, database save, and Excel export.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload Purchase Bill</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload image or PDF. If parsing works, rows will be filled. If parsing fails,
                  manual entry stays available and Excel download still works.
                </p>
              </div>

              {/* CHANGED: mobile upload fix - direct button click */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploading ? "Uploading..." : "Upload Bill"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={uploading}
                />

                <button
                  type="button"
                  onClick={handleManualExcelDownload}
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Download Excel
                </button>
              </div>
            </div>

            {lastUploadName ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Last Uploaded File:</span> {lastUploadName}
                </p>
                {parseStatus ? <p className="mt-1 text-slate-500">{parseStatus}</p> : null}
              </div>
            ) : null}

            {previewBlock}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Manual Medicine Entry</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add or edit stock manually. Uploaded bill URL will be attached to rows.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Add Row
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save to Database"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1450px] w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Medicine Name</th>
                    <th className="px-3 py-3 text-left font-semibold">Pack</th>
                    <th className="px-3 py-3 text-left font-semibold">Batch Number</th>
                    <th className="px-3 py-3 text-left font-semibold">Expiry Date</th>
                    <th className="px-3 py-3 text-left font-semibold">Quantity</th>
                    <th className="px-3 py-3 text-left font-semibold">MRP</th>
                    <th className="px-3 py-3 text-left font-semibold">Purchase Price</th>
                    <th className="px-3 py-3 text-left font-semibold">Selling Price</th>
                    <th className="px-3 py-3 text-left font-semibold">GST %</th>
                    <th className="px-3 py-3 text-left font-semibold">Discount %</th>
                    <th className="px-3 py-3 text-left font-semibold">Value</th>
                    <th className="px-3 py-3 text-left font-semibold">Vendor Name</th>
                    <th className="px-3 py-3 text-left font-semibold">Warnings</th>
                    <th className="px-3 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const warning = warnings[index];
                    return (
                      <tr key={row.id} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.medicineName}
                            onChange={(e) => handleRowChange(row.id, "medicineName", e.target.value)}
                            placeholder="Medicine Name"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.pack || ""}
                            onChange={(e) => handleRowChange(row.id, "pack", e.target.value)}
                            placeholder="Pack"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) => handleRowChange(row.id, "batchNumber", e.target.value)}
                            placeholder="Batch Number"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) => handleRowChange(row.id, "expiryDate", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, "quantity", e.target.value)}
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.mrp || ""}
                            onChange={(e) => handleRowChange(row.id, "mrp", e.target.value)}
                            placeholder="MRP"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.purchasePrice}
                            onChange={(e) => handleRowChange(row.id, "purchasePrice", e.target.value)}
                            placeholder="Purchase Price"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.sellingPrice}
                            onChange={(e) => handleRowChange(row.id, "sellingPrice", e.target.value)}
                            placeholder="Selling Price"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.gstPercent || ""}
                            onChange={(e) => handleRowChange(row.id, "gstPercent", e.target.value)}
                            placeholder="GST %"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.discountPercent || ""}
                            onChange={(e) => handleRowChange(row.id, "discountPercent", e.target.value)}
                            placeholder="Discount %"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.value || ""}
                            onChange={(e) => handleRowChange(row.id, "value", e.target.value)}
                            placeholder="Value"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.vendorName}
                            onChange={(e) => handleRowChange(row.id, "vendorName", e.target.value)}
                            placeholder="Vendor Name"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            {warning.lowStock ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                Low Stock
                              </span>
                            ) : null}

                            {warning.expiringSoon ? (
                              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                                Expiring Soon
                              </span>
                            ) : null}

                            {warning.expired ? (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                Expired
                              </span>
                            ) : null}

                            {!warning.lowStock && !warning.expiringSoon && !warning.expired ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                OK
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {billFileUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* CHANGED: anchor badulu button use chesanu */}
                <button
                  type="button"
                  onClick={() => openBillUrl(billFileUrl)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Uploaded Bill
                </button>

                <button
                  type="button"
                  onClick={handleManualExcelDownload}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Download Excel Again
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Module Summary</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  Manual Rows
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{rows.length}</p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                  Low Stock Items
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {
                    warnings.filter((w, i) => {
                      const qty = toNumber(rows[i]?.quantity ?? 0);
                      return qty > 0 && qty < LOW_STOCK_THRESHOLD;
                    }).length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Expired / Near Expiry
                </p>
                <p className="mt-1 text-2xl font-bold text-red-900">
                  {warnings.filter((w) => w.expired || w.expiringSoon).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Saved Stock List</h2>
              <button
                type="button"
                onClick={fetchSavedItems}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-[700px] space-y-3 overflow-y-auto">
              {loadingList ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : savedItems.length === 0 ? (
                <p className="text-sm text-slate-500">No saved stock found.</p>
              ) : (
                savedItems.map((item, idx) => (
                  <div
                    key={`${item.id || item.batchNumber || idx}-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.medicineName}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Batch: {item.batchNumber || "-"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Vendor: {item.vendorName || "-"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Expiry: {item.expiryDate || "-"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Qty: {item.quantity} | Purchase: ₹{item.purchasePrice} | Selling: ₹
                          {item.sellingPrice}
                        </p>
                      </div>

                      {/* CHANGED: 404 fix kosam anchor badulu button */}
                      {item.billFileUrl ? (
                        <button
                          type="button"
                          onClick={() => openBillUrl(item.billFileUrl)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          View Bill
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}