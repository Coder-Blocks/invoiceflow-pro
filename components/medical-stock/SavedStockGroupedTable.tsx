"use client";

import { useState } from "react";
import type { MedicalStockGroupedItem } from "@/types/medical-stock";

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

export default function SavedStockGroupedTable({
  items,
  onPreviewBill,
}: {
  items: MedicalStockGroupedItem[];
  onPreviewBill: (url: string, title?: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 px-4 py-8 text-center text-slate-500">
          No medical stock found.
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid gap-3 bg-slate-50 px-4 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-center">
              <div>
                <div className="text-base font-semibold text-slate-900">{item.medicineName}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Vendors: {item.vendorNames.join(", ") || "-"}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Qty</div>
                <div className="font-semibold text-slate-900">{item.totalQuantity}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Batches</div>
                <div className="font-semibold text-slate-900">{item.batchCount}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Latest Buy</div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(item.latestPurchasePrice)}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Latest Sell</div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(item.latestSellingPrice)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
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

                {item.isLowStock && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Low Stock
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                >
                  {expanded[item.id] ? "Hide Batches" : "View Batches"}
                </button>
              </div>
            </div>

            {expanded[item.id] && (
              <div className="overflow-x-auto bg-white">
                <table className="min-w-300 w-full border-collapse text-sm">
                  <thead className="bg-white">
                    <tr className="border-t border-slate-200 text-left text-slate-700">
                      <th className="px-3 py-3 font-semibold">Batch Number</th>
                      <th className="px-3 py-3 font-semibold">Expiry Date</th>
                      <th className="px-3 py-3 font-semibold">Quantity</th>
                      <th className="px-3 py-3 font-semibold">Purchase Price</th>
                      <th className="px-3 py-3 font-semibold">Selling Price</th>
                      <th className="px-3 py-3 font-semibold">Vendor</th>
                      <th className="px-3 py-3 font-semibold">Bill</th>
                      <th className="px-3 py-3 font-semibold">Price History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.batches.map((batch) => (
                      <tr key={batch.id} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-3 font-medium text-slate-900">{batch.batchNumber}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDateDisplay(batch.expiryDate)}</td>
                        <td className="px-3 py-3 text-slate-700">{batch.quantity}</td>
                        <td className="px-3 py-3 text-slate-700">{formatCurrency(batch.purchasePrice)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatCurrency(batch.sellingPrice)}</td>
                        <td className="px-3 py-3 text-slate-700">{batch.vendorName || "-"}</td>
                        <td className="px-3 py-3">
                          {batch.billFileUrl ? (
                            <button
                              type="button"
                              onClick={() => onPreviewBill(batch.billFileUrl || "", item.medicineName)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View Bill
                            </button>
                          ) : (
                            <span className="text-slate-400">No bill</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-2">
                            {batch.priceHistory.length === 0 ? (
                              <span className="text-slate-400">No history</span>
                            ) : (
                              batch.priceHistory.slice(0, 10).map((history) => (
                                <div
                                  key={history.id}
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                                >
                                  <div>Date: {formatDateDisplay(history.createdAt)}</div>
                                  <div>Qty: {history.quantity}</div>
                                  <div>Buy: {formatCurrency(history.purchasePrice)}</div>
                                  <div>Sell: {formatCurrency(history.sellingPrice)}</div>
                                  <div>Expiry: {formatDateDisplay(history.expiryDate)}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}