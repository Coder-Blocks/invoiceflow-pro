"use client";

import { useEffect, useMemo, useState } from "react";

type BankTransaction = {
  id: string;
  transactionDate: string;
  description: string;
  reference: string | null;
  debit: string | number;
  credit: string | number;
  balance: string | number | null;
  isReconciled: boolean;
  bankStatement: {
    bankName: string;
    accountNumber: string | null;
  };
};

type Payment = {
  id: string;
  amount: string | number;
  paymentDate: string;
  method: string;
  invoice: {
    invoiceNumber: string;
    customer: {
      name: string | null;
    } | null;
  };
  bankReconciliations: Array<{ id: string }>;
};

export default function BankReconciliationPage() {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [importing, setImporting] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedBankTxn, setSelectedBankTxn] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");

  async function fetchData() {
    const res = await fetch("/api/accounting/bank-reconciliation");
    const data = await res.json();

    if (data.success) {
      setTransactions(data.data.transactions);
      setPayments(data.data.payments);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const unmatchedTransactions = useMemo(() => {
    return transactions.filter((txn) => !txn.isReconciled);
  }, [transactions]);

  const reconciledTransactions = useMemo(() => {
    return transactions.filter((txn) => txn.isReconciled);
  }, [transactions]);

  const unmatchedPayments = useMemo(() => {
    return payments.filter((payment) => payment.bankReconciliations.length === 0);
  }, [payments]);

  async function importCsv(file: File) {
    if (!bankName) {
      alert("Please enter bank name");
      return;
    }

    setImporting(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("bankName", bankName);
    fd.append("accountNumber", accountNumber);

    const res = await fetch("/api/accounting/bank-reconciliation/import", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setImporting(false);

    if (!data.success) {
      alert(data.error || "Failed to import CSV");
      return;
    }

    alert(`Imported ${data.importedRows} bank transactions`);
    fetchData();
  }

  async function autoMatch() {
    setAutoMatching(true);

    const res = await fetch("/api/accounting/bank-reconciliation/auto-match", {
      method: "POST",
    });

    const data = await res.json();
    setAutoMatching(false);

    if (!data.success) {
      alert(data.error || "Auto match failed");
      return;
    }

    alert(`Auto matched ${data.matchedCount} transactions`);
    fetchData();
  }

  async function reconcileManual() {
    if (!selectedBankTxn || !selectedPayment) {
      alert("Select bank transaction and payment");
      return;
    }

    const res = await fetch("/api/accounting/bank-reconciliation/reconcile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankTransactionId: selectedBankTxn,
        paymentId: selectedPayment,
        notes: "Manual payment reconciliation",
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "Manual reconciliation failed");
      return;
    }

    alert("Transaction reconciled");
    setSelectedBankTxn("");
    setSelectedPayment("");
    fetchData();
  }

  async function downloadExcel() {
    const res = await fetch("/api/accounting/bank-reconciliation/export");

    if (!res.ok) {
      alert("Failed to download Excel");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-reconciliation.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Bank Reconciliation
          </h1>
          <p className="mt-1 text-slate-600">
            Import bank CSV, auto-match payments, and reconcile unmatched transactions.
          </p>
        </div>

        <button
          onClick={downloadExcel}
          className="rounded-md bg-green-600 px-4 py-2 text-white"
        >
          Download Excel
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Import Bank Statement CSV</h2>

          <input
            className="w-full rounded-md border p-3"
            placeholder="Bank Name"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />

          <input
            className="w-full rounded-md border p-3"
            placeholder="Account Number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />

          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importCsv(file);
            }}
          />

          {importing ? (
            <p className="text-sm text-blue-600">Importing CSV...</p>
          ) : null}

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            CSV headers supported:
            <br />
            Date / Transaction Date, Description / Narration, Reference / UTR,
            Debit / Withdrawal, Credit / Deposit, Balance
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Reconciliation Actions</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total Bank Txns" value={transactions.length} />
            <Card title="Unmatched" value={unmatchedTransactions.length} />
            <Card title="Reconciled" value={reconciledTransactions.length} />
          </div>

          <button
            onClick={autoMatch}
            disabled={autoMatching}
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            {autoMatching ? "Matching..." : "Auto Match Payments"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">Manual Reconciliation</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <select
            className="rounded-md border p-3"
            value={selectedBankTxn}
            onChange={(e) => setSelectedBankTxn(e.target.value)}
          >
            <option value="">Select Bank Transaction</option>
            {unmatchedTransactions.map((txn) => (
              <option key={txn.id} value={txn.id}>
                {new Date(txn.transactionDate).toISOString().slice(0, 10)} -{" "}
                {txn.description} - Cr ₹{Number(txn.credit).toFixed(2)} Dr ₹
                {Number(txn.debit).toFixed(2)}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border p-3"
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
          >
            <option value="">Select System Payment</option>
            {unmatchedPayments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {new Date(payment.paymentDate).toISOString().slice(0, 10)} -{" "}
                {payment.invoice.invoiceNumber} - ₹
                {Number(payment.amount).toFixed(2)}
              </option>
            ))}
          </select>

          <button
            onClick={reconcileManual}
            className="rounded-md bg-green-600 px-4 py-2 text-white"
          >
            Reconcile
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Unmatched Bank Transactions</h2>

        <BankTable transactions={unmatchedTransactions} />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Reconciled Transactions</h2>

        <BankTable transactions={reconciledTransactions} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BankTable({ transactions }: { transactions: BankTransaction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="border-b">
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Bank</th>
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-left">Reference</th>
            <th className="px-4 py-3 text-right">Debit</th>
            <th className="px-4 py-3 text-right">Credit</th>
            <th className="px-4 py-3 text-right">Balance</th>
          </tr>
        </thead>

        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                No records found.
              </td>
            </tr>
          ) : (
            transactions.map((txn) => (
              <tr key={txn.id} className="border-b">
                <td className="px-4 py-3">
                  {new Date(txn.transactionDate).toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3">{txn.bankStatement.bankName}</td>
                <td className="px-4 py-3">{txn.description}</td>
                <td className="px-4 py-3">{txn.reference || "-"}</td>
                <td className="px-4 py-3 text-right">
                  ₹{Number(txn.debit).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  ₹{Number(txn.credit).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  {txn.balance !== null && txn.balance !== undefined
                    ? `₹${Number(txn.balance).toFixed(2)}`
                    : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}