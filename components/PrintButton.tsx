"use client";

export default function PrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition"
    >
      Print / Save PDF
    </button>
  );
}