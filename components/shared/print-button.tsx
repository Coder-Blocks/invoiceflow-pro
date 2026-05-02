"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-blue-600 px-5 py-2 text-white print:hidden"
    >
      Download / Print PDF
    </button>
  );
}