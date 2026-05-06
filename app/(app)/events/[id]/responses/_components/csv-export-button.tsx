"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column { id: string; label: string; type: string }
interface AttendeeRow {
  name: string;
  email: string;
  responses: Record<string, { answer: string | null; fileUrl: string | null }>;
}

interface CsvExportButtonProps {
  columns: Column[];
  rows: AttendeeRow[];
  filename?: string;
}

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function CsvExportButton({ columns, rows, filename = "responses.csv" }: CsvExportButtonProps) {
  function handleExport() {
    const headers = ["Name", "Email", ...columns.map((c) => c.label)];
    const csvRows = rows.map((row) => {
      const cells = [
        row.name,
        row.email,
        ...columns.map((col) => {
          const r = row.responses[col.id];
          if (!r) return "—";
          if (r.fileUrl) return r.fileUrl;
          return r.answer ?? "—";
        }),
      ];
      return cells.map(escapeCell).join(",");
    });

    const csv = [headers.map(escapeCell).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-4 mr-1.5" />
      Export CSV
    </Button>
  );
}
