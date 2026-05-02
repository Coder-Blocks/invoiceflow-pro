"use client";

import { useEffect, useMemo, useState, useRef } from "react";

type ParsedItem = {
  medicineName: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  unitType: string;
};

type StockItem = {
  id: string;
  medicineName: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  unitType: string;
  lowStockThreshold: number;
};

export default function MedicalStockPage() {
  const [uploadingBill, setUploadingBill] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [selling, setSelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [billImageUrl, setBillImageUrl] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [billIssueDate, setBillIssueDate] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [rawText, setRawText] = useState("");

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [lowStock, setLowStock] = useState<StockItem[]>([]);
  const [showLowStockPopup, setShowLowStockPopup] = useState(true);

  const importFileRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState({
    medicineName: "",
    quantity: "",
    batchNumber: "",
    expiryDate: "",
    costPrice: "",
    unitType: "STRIP",
    lowStockThreshold: "",
    paymentAccount: "Payables",
  });

  const [sellForm, setSellForm] = useState({
    stockId: "",
    quantitySold: "",
    saleAmount: "",
    paymentAccount: "Cash",
    notes: "",
  });

  async function safeJson(res: Response) {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      console.error("NON_JSON_RESPONSE:", text);
      return {
        success: false,
        error: "Server returned HTML error. Check terminal.",
      };
    }
  }

  async function fetchStockData() {
    try {
      const res = await fetch("/api/medical-stock", {
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        console.error("MEDICAL_STOCK_API_ERROR:", data);
        alert(data.error || "Failed to fetch medical stock");
        return;
      }

      setStocks(data.data.stocks || []);
      setLowStock(data.data.lowStock || []);
    } catch (error) {
      console.error("FETCH_MEDICAL_STOCK_ERROR:", error);
      alert("Failed to load medical stock. Check terminal error.");
    }
  }

  useEffect(() => {
    fetchStockData();
  }, []);

  async function uploadBill(file: File) {
    try {
      setUploadingBill(true);
      setOcrLoading(true);

      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      });

      const uploadData = await safeJson(uploadRes);

      if (!uploadRes.ok || !uploadData.success) {
        alert(uploadData.error || "Bill upload failed");
        return;
      }

      setBillImageUrl(uploadData.url);
      setParsedItems([]);

      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(uploadData.url, "eng");
      const text = result.data.text || "";
      setRawText(text);

      const parseRes = await fetch("/api/medical-stock/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const parseData = await safeJson(parseRes);

      if (!parseRes.ok || !parseData.success) {
        alert(parseData.error || "Bill uploaded, but OCR parse failed");
        return;
      }

      setBillIssueDate(parseData.data.issueDate || "");
      setBillAmount(
        parseData.data.totalAmount ? String(parseData.data.totalAmount) : ""
      );
      setParsedItems(parseData.data.items || []);

      alert("Bill uploaded and parsed. Please verify rows before saving.");
    } catch (error) {
      console.error("BILL_UPLOAD_PARSE_ERROR:", error);
      alert("Bill upload/parse failed");
    } finally {
      setUploadingBill(false);
      setOcrLoading(false);
    }
  }

  function updateParsedItem(
    index: number,
    field: keyof ParsedItem,
    value: string
  ) {
    setParsedItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "medicineName" ||
                field === "batchNumber" ||
                field === "expiryDate" ||
                field === "unitType"
                  ? value
                  : Number(value),
            }
          : item
      )
    );
  }

  function addParsedRow() {
    setParsedItems((prev) => [
      ...prev,
      {
        medicineName: "",
        quantity: 1,
        batchNumber: "",
        expiryDate: new Date().toISOString().slice(0, 10),
        costPrice: 0,
        unitType: "STRIP",
      },
    ]);
  }

  function removeParsedRow(index: number) {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveParsedBill() {
    if (!parsedItems.length) {
      alert("No medicines found. Please add medicine rows manually.");
      return;
    }

    const validItems = parsedItems.filter(
      (item) =>
        item.medicineName &&
        Number(item.quantity) > 0 &&
        item.batchNumber &&
        item.expiryDate &&
        Number(item.costPrice) >= 0
    );

    if (validItems.length === 0) {
      alert("Please fill medicine name, quantity, batch, expiry date and cost.");
      return;
    }

    setSavingBill(true);

    const res = await fetch("/api/medical-stock/upload-bill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vendorName,
        issueDate: billIssueDate || new Date().toISOString().slice(0, 10),
        totalAmount: Number(billAmount || 0),
        fileUrl: billImageUrl,
        notes: billNotes,
        paymentAccount: "Payables",
        items: validItems,
      }),
    });

    const data = await safeJson(res);
    setSavingBill(false);

    if (!res.ok || !data.success) {
      alert(data.error || "Failed to save bill into stock");
      return;
    }

    alert("Purchase bill saved and inventory accounting posted.");

    setBillImageUrl("");
    setVendorName("");
    setBillIssueDate("");
    setBillAmount("");
    setBillNotes("");
    setParsedItems([]);
    setRawText("");

    await fetchStockData();
  }

  async function saveManualStock(e: React.FormEvent) {
    e.preventDefault();
    setSavingManual(true);

    const res = await fetch("/api/medical-stock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        medicineName: manualForm.medicineName,
        quantity: Number(manualForm.quantity),
        batchNumber: manualForm.batchNumber,
        expiryDate: manualForm.expiryDate,
        costPrice: Number(manualForm.costPrice),
        unitType: manualForm.unitType,
        paymentAccount: manualForm.paymentAccount,
        lowStockThreshold: manualForm.lowStockThreshold
          ? Number(manualForm.lowStockThreshold)
          : manualForm.unitType === "BOTTLE"
          ? 5
          : 10,
      }),
    });

    const data = await safeJson(res);
    setSavingManual(false);

    if (!res.ok || !data.success) {
      alert(data.error || "Failed to save stock");
      return;
    }

    alert("Manual stock added and inventory accounting posted.");

    setManualForm({
      medicineName: "",
      quantity: "",
      batchNumber: "",
      expiryDate: "",
      costPrice: "",
      unitType: "STRIP",
      lowStockThreshold: "",
      paymentAccount: "Payables",
    });

    fetchStockData();
  }

  async function sellMedicine(e: React.FormEvent) {
    e.preventDefault();
    setSelling(true);

    const res = await fetch("/api/medical-stock/sell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockId: sellForm.stockId,
        quantitySold: Number(sellForm.quantitySold),
        saleAmount: Number(sellForm.saleAmount || 0),
        paymentAccount: sellForm.paymentAccount,
        notes: sellForm.notes,
      }),
    });

    const data = await safeJson(res);
    setSelling(false);

    if (!res.ok || !data.success) {
      alert(data.error || "Failed to sell medicine");
      return;
    }

    alert("Medicine sale saved. COGS and sales accounting posted.");

    setSellForm({
      stockId: "",
      quantitySold: "",
      saleAmount: "",
      paymentAccount: "Cash",
      notes: "",
    });

    fetchStockData();
  }

  // --- Export & Import Handlers ---
  async function handleExportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/medical-stock/excel");
      if (!res.ok) {
        const data = await safeJson(res);
        alert(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medical-stock-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("EXPORT_ERROR:", err);
      alert("Failed to export stock");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      alert("Please upload a .xlsx file");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/medical-stock/import", {
        method: "POST",
        body: formData,
      });
      const data = await safeJson(res);
      if (!res.ok || !data.success) {
        alert(data.error || "Import failed");
        return;
      }
      alert(data.message || "Import completed successfully");
      await fetchStockData();
    } catch (err) {
      console.error("IMPORT_ERROR:", err);
      alert("Failed to import stock");
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }
  // --- End of Export & Import Handlers ---

  const groupedLowStockText = useMemo(() => {
    return lowStock
      .map(
        (item) =>
          `${item.medicineName} - ${item.quantity} ${item.unitType.toLowerCase()}`
      )
      .join(", ");
  }, [lowStock]);

  return (
    <div className="space-y-8">
      {showLowStockPopup && lowStock.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-red-600">
              Low Stock Alert
            </h2>
            <p className="mt-2 text-slate-600">
              These medicines are below minimum stock:
            </p>

            <div className="mt-4 max-h-60 space-y-2 overflow-auto rounded-xl border p-4">
              {lowStock.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-semibold text-slate-900">
                    {item.medicineName}
                  </p>
                  <p className="text-sm text-slate-500">
                    Qty: {item.quantity} {item.unitType.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowLowStockPopup(false)}
                className="rounded-md bg-blue-600 px-4 py-2 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Medical Stock</h1>
        <p className="mt-1 text-slate-600">
          Upload purchase bills, manage stock, sell medicines, and auto-post
          inventory accounting.
        </p>
      </div>

      {lowStock.length > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <strong>Low Stock:</strong> {groupedLowStockText}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Upload Purchase Bill</h2>

          <input
            type="text"
            className="w-full rounded-md border p-3"
            placeholder="Vendor Name"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadBill(file);
            }}
          />

          {uploadingBill || ocrLoading ? (
            <p className="text-sm text-blue-600">
              Uploading bill and reading medicines...
            </p>
          ) : null}

          {billImageUrl ? (
            <div className="space-y-3">
              <a
                href={billImageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-700 underline"
              >
                View uploaded bill
              </a>
              <p className="text-sm text-slate-500">
                Verify medicine rows before saving into stock.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="date"
              className="rounded-md border p-3"
              value={billIssueDate}
              onChange={(e) => setBillIssueDate(e.target.value)}
            />
            <input
              type="number"
              className="rounded-md border p-3"
              placeholder="Bill Amount"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </div>

          <textarea
            className="w-full rounded-md border p-3"
            placeholder="Bill Notes"
            value={billNotes}
            onChange={(e) => setBillNotes(e.target.value)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Parsed / Manual Medicine Rows
              </h3>

              <button
                type="button"
                onClick={addParsedRow}
                className="rounded-md border px-4 py-2"
              >
                Add Medicine Row
              </button>
            </div>

            {parsedItems.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                No rows yet. Upload a clear bill image or add rows manually.
              </p>
            ) : (
              <div className="space-y-3">
                {parsedItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border p-4 md:grid-cols-7"
                  >
                    <input
                      className="rounded-md border p-2 md:col-span-2"
                      placeholder="Medicine Name"
                      value={item.medicineName}
                      onChange={(e) =>
                        updateParsedItem(index, "medicineName", e.target.value)
                      }
                    />
                    <input
                      className="rounded-md border p-2"
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateParsedItem(index, "quantity", e.target.value)
                      }
                    />
                    <input
                      className="rounded-md border p-2"
                      placeholder="Batch"
                      value={item.batchNumber}
                      onChange={(e) =>
                        updateParsedItem(index, "batchNumber", e.target.value)
                      }
                    />
                    <input
                      className="rounded-md border p-2"
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) =>
                        updateParsedItem(index, "expiryDate", e.target.value)
                      }
                    />
                    <input
                      className="rounded-md border p-2"
                      type="number"
                      placeholder="Cost"
                      value={item.costPrice}
                      onChange={(e) =>
                        updateParsedItem(index, "costPrice", e.target.value)
                      }
                    />

                    <select
                      className="rounded-md border p-2"
                      value={item.unitType}
                      onChange={(e) =>
                        updateParsedItem(index, "unitType", e.target.value)
                      }
                    >
                      <option value="STRIP">STRIP</option>
                      <option value="BOTTLE">BOTTLE</option>
                      <option value="BOX">BOX</option>
                      <option value="UNIT">UNIT</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeParsedRow(index)}
                      className="rounded-md border px-3 py-2 text-red-600 md:col-span-7"
                    >
                      Remove Row
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={saveParsedBill}
              disabled={savingBill}
              className="rounded-md bg-green-600 px-4 py-2 text-white"
            >
              {savingBill ? "Saving..." : "Save Bill & Add Stock"}
            </button>
          </div>

          {rawText ? (
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Show OCR Text
              </summary>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600">
                {rawText}
              </pre>
            </details>
          ) : null}
        </div>

        <div className="space-y-6">
          <form
            onSubmit={saveManualStock}
            className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">Manual Stock Entry</h2>

            <input
              className="w-full rounded-md border p-3"
              placeholder="Medicine Name"
              value={manualForm.medicineName}
              onChange={(e) =>
                setManualForm((p) => ({ ...p, medicineName: e.target.value }))
              }
              required
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="Quantity"
                value={manualForm.quantity}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, quantity: e.target.value }))
                }
                required
              />
              <select
                className="rounded-md border p-3"
                value={manualForm.unitType}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, unitType: e.target.value }))
                }
              >
                <option value="STRIP">STRIP</option>
                <option value="BOTTLE">BOTTLE</option>
                <option value="BOX">BOX</option>
                <option value="UNIT">UNIT</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-md border p-3"
                placeholder="Batch Number"
                value={manualForm.batchNumber}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, batchNumber: e.target.value }))
                }
                required
              />
              <input
                className="rounded-md border p-3"
                type="date"
                value={manualForm.expiryDate}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, expiryDate: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="Medicine Cost"
                value={manualForm.costPrice}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, costPrice: e.target.value }))
                }
                required
              />
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="Low Stock Threshold"
                value={manualForm.lowStockThreshold}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    lowStockThreshold: e.target.value,
                  }))
                }
              />
            </div>

            <select
              className="w-full rounded-md border p-3"
              value={manualForm.paymentAccount}
              onChange={(e) =>
                setManualForm((p) => ({
                  ...p,
                  paymentAccount: e.target.value,
                }))
              }
            >
              <option value="Payables">Payables</option>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
            </select>

            <button
              type="submit"
              disabled={savingManual}
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              {savingManual ? "Saving..." : "Save Manual Stock"}
            </button>
          </form>

          <form
            onSubmit={sellMedicine}
            className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">Sell Medicine</h2>

            <select
              className="w-full rounded-md border p-3"
              value={sellForm.stockId}
              onChange={(e) =>
                setSellForm((p) => ({ ...p, stockId: e.target.value }))
              }
              required
            >
              <option value="">Select Medicine Stock</option>
              {stocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.medicineName} - {stock.batchNumber} - Qty{" "}
                  {stock.quantity}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded-md border p-3"
              type="number"
              placeholder="Quantity Sold"
              value={sellForm.quantitySold}
              onChange={(e) =>
                setSellForm((p) => ({ ...p, quantitySold: e.target.value }))
              }
              required
            />

            <input
              className="w-full rounded-md border p-3"
              type="number"
              placeholder="Sale Amount"
              value={sellForm.saleAmount}
              onChange={(e) =>
                setSellForm((p) => ({ ...p, saleAmount: e.target.value }))
              }
            />

            <select
              className="w-full rounded-md border p-3"
              value={sellForm.paymentAccount}
              onChange={(e) =>
                setSellForm((p) => ({
                  ...p,
                  paymentAccount: e.target.value,
                }))
              }
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>

            <textarea
              className="w-full rounded-md border p-3"
              placeholder="Sale Notes"
              value={sellForm.notes}
              onChange={(e) =>
                setSellForm((p) => ({ ...p, notes: e.target.value }))
              }
            />

            <button
              type="submit"
              disabled={selling}
              className="rounded-md bg-green-600 px-4 py-2 text-white"
            >
              {selling ? "Saving..." : "Save Sale"}
            </button>
          </form>
        </div>
      </div>

      {/* Export/Import Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {exporting ? "Exporting..." : "📥 Export Stock to Excel"}
        </button>

        <label className="cursor-pointer rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          {importing ? "Importing..." : "📤 Import Stock Excel"}
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportExcel}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Current Medical Stock</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Medicine</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Cost</th>
                <th className="px-4 py-3 text-left">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No stock found
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const isLow =
                    Number(stock.quantity) <= Number(stock.lowStockThreshold);

                  return (
                    <tr
                      key={stock.id}
                      className={`border-b ${isLow ? "bg-red-50" : "bg-white"}`}
                    >
                      <td className="px-4 py-3">{stock.medicineName}</td>
                      <td className="px-4 py-3 font-semibold">
                        {stock.quantity}
                      </td>
                      <td className="px-4 py-3">{stock.unitType}</td>
                      <td className="px-4 py-3">{stock.batchNumber}</td>
                      <td className="px-4 py-3">
                        {new Date(stock.expiryDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        ₹{Number(stock.costPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{stock.lowStockThreshold}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}