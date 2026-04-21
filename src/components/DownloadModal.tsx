"use client";

import { useState, useEffect } from "react";
import { X, FileSpreadsheet, FileText, Download, Calendar, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PressEntry {
  id: string;
  type: "COOK" | "REPRESS";
  loadTime: string | null;
  unloadTime: string | null;
  quantity: number;
  category: { id: string; name: string };
  thickness: { id: string; value: number };
  size: { id: string; label: string; length: number; width: number; sqft: number };
}

interface GlueEntry { time: string; barrels: number; }
interface PauseEvent { id: string; type: string; startTime: string; endTime: string | null; notes: string | null; }

interface HotPressSession {
  id: string;
  shiftDate: string;
  entries: PressEntry[];
  glueEntries: GlueEntry[];
  pauseEvents: PauseEvent[];
  operator?: { name: string };
  startTime: string;
  stopTime: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function durStr(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function cookingTime(e: PressEntry) {
  if (!e.loadTime || !e.unloadTime) return "--";
  return durStr(new Date(e.unloadTime).getTime() - new Date(e.loadTime).getTime());
}

function buildSummaryMap(entries: PressEntry[]) {
  const summary: Record<string, { category: string; thickness: number; size: string; totalQty: number; cookCount: number; totalSqft: number; }> = {};
  entries.filter(e => e.type === "COOK" && e.unloadTime).forEach(e => {
    const k = `${e.category.name}|${e.thickness.value}|${e.size.length}x${e.size.width}`;
    const sqftFactor = e.size.sqft || 0;
    if (!summary[k]) {
      summary[k] = { category: e.category.name, thickness: e.thickness.value, size: `${e.size.length}×${e.size.width}`, totalQty: 0, cookCount: 0, totalSqft: 0 };
    }
    summary[k].totalQty += e.quantity;
    summary[k].cookCount += 1;
    summary[k].totalSqft += e.quantity * sqftFactor;
  });
  return Object.values(summary);
}

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalFilter: string;
  operatorFilter: string;
}

export default function DownloadModal({ isOpen, onClose, approvalFilter, operatorFilter }: DownloadModalProps) {
  const [rangeType, setRangeType] = useState<"YESTERDAY" | "THIS_WEEK" | "CUSTOM">("YESTERDAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState<"XLSX" | "PDF">("XLSX");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRangeType("YESTERDAY");
      setFormat("XLSX");
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      setFromDate(yest.toISOString().split("T")[0]);
      setToDate(yest.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const handleRangeChange = (type: "YESTERDAY" | "THIS_WEEK" | "CUSTOM") => {
    setRangeType(type);
    const now = new Date();
    if (type === "YESTERDAY") {
      now.setDate(now.getDate() - 1);
      setFromDate(now.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (type === "THIS_WEEK") {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      setFromDate(monday.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  const handleDownload = async () => {
    if (!fromDate || !toDate) return alert("Please select a date range");
    setIsDownloading(true);
    try {
      let url = `/api/hotpress?view=history&export=true`;
      url += `&from=${fromDate}&to=${toDate}`;
      if (approvalFilter !== "ALL") url += `&status=${approvalFilter}`;
      if (operatorFilter !== "ALL") url += `&operator=${operatorFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      
      const sessions = data.sessions || [];
      if (sessions.length === 0) {
        alert("No records found for the selected range.");
        setIsDownloading(false);
        return;
      }

      const groupedByDate: Record<string, HotPressSession[]> = {};
      sessions.forEach((s: HotPressSession) => {
        const dStr = fmtDate(s.shiftDate);
        if (!groupedByDate[dStr]) groupedByDate[dStr] = [];
        groupedByDate[dStr].push(s);
      });

      if (format === "XLSX") {
        downloadExcel(groupedByDate);
      } else {
        downloadPDF(groupedByDate);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error occurred while generating download.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadExcel = (groupedData: Record<string, HotPressSession[]>) => {
    const wb = XLSX.utils.book_new();

    Object.entries(groupedData).forEach(([dateStr, sessList]) => {
      const sheetData: any[][] = [];
      sheetData.push([`Production Log List - ${dateStr}`]);
      
      let allEntries: PressEntry[] = [];
      let totalGlueBarrels = 0;
      let totalMaintMs = 0;
      let totalPauseMs = 0;

      sessList.forEach(sess => {
        const opName = sess.operator?.name || "Unknown";
        
        sheetData.push([]);
        sheetData.push([`--- Session Operator: ${opName} | Start: ${sess.startTime ? new Date(sess.startTime).toLocaleTimeString() : '--:--'} | Stop: ${sess.stopTime ? new Date(sess.stopTime).toLocaleTimeString() : '--:--'} ---`]);
        
        if (sess.entries?.length > 0) {
          sheetData.push(["Sl.No", "Type", "Category", "Thickness (mm)", "Size", "Quantity", "Cook Time", "Load Time", "Unload Time"]);
          let slNo = 1;
          sess.entries.forEach(entry => {
            allEntries.push(entry);
            sheetData.push([
              slNo++,
              entry.type,
              entry.category?.name || "N/A",
              entry.thickness.value,
              `${entry.size.length}x${entry.size.width}`,
              entry.quantity,
              cookingTime(entry),
              entry.loadTime ? new Date(entry.loadTime).toLocaleTimeString() : "--:--",
              entry.unloadTime ? new Date(entry.unloadTime).toLocaleTimeString() : "--:--"
            ]);
          });
        }

        if (sess.glueEntries?.length > 0) {
          sheetData.push([]);
          sheetData.push(["Glue Inputs", "Time", "Barrels"]);
          sess.glueEntries.forEach(g => {
            totalGlueBarrels += g.barrels;
            sheetData.push([
              "",
              g.time ? new Date(g.time).toLocaleTimeString() : "--:--",
              g.barrels
            ]);
          });
        }

        if (sess.pauseEvents?.length > 0) {
          sheetData.push([]);
          sheetData.push(["Pause/Maint", "Type", "Start Time", "End Time", "Duration", "Notes"]);
          sess.pauseEvents.forEach(p => {
            const start = new Date(p.startTime);
            const end = p.endTime ? new Date(p.endTime) : new Date();
            const durMs = end.getTime() - start.getTime();
            if (p.type === "MAINTENANCE") totalMaintMs += durMs;
            else totalPauseMs += durMs;
            
            sheetData.push([
              "",
              p.type,
              start.toLocaleTimeString(),
              p.endTime ? new Date(p.endTime).toLocaleTimeString() : "Ongoing",
              durStr(durMs),
              p.notes || ""
            ]);
          });
        }
        sheetData.push([]);
      });

      sheetData.push([]);
      sheetData.push([`Production Summary - ${dateStr}`]);
      sheetData.push(["Category", "Thickness (mm)", "Size", "Total Cooks", "Total Quantity", "Total Sq.Ft"]);

      let totalDocSqft = 0;
      const summaryList = buildSummaryMap(allEntries);
      summaryList.forEach(sum => {
        totalDocSqft += sum.totalSqft;
        sheetData.push([
          sum.category,
          sum.thickness,
          sum.size,
          sum.cookCount,
          sum.totalQty,
          sum.totalSqft.toFixed(1)
        ]);
      });

      sheetData.push([]);
      sheetData.push(["Aggregates"]);
      sheetData.push(["Total Square Feet", totalDocSqft.toFixed(1)]);
      sheetData.push(["Total Glue Used", `${totalGlueBarrels} bbl`]);
      sheetData.push(["Total Maintenance", durStr(totalMaintMs)]);
      sheetData.push(["Total Pause", durStr(totalPauseMs)]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      let validSheetName = dateStr.slice(0, 31).replace(/[:\\\/?*\[\]]/g, "-");
      XLSX.utils.book_append_sheet(wb, ws, validSheetName);
    });

    XLSX.writeFile(wb, `Production_Log_${fromDate}_to_${toDate}.xlsx`);
  };

  const downloadPDF = (groupedData: Record<string, HotPressSession[]>) => {
    const doc = new jsPDF("landscape");
    const dates = Object.keys(groupedData);

    dates.forEach((dateStr, idx) => {
      if (idx > 0) doc.addPage();
      const sessList = groupedData[dateStr];
      
      let allEntries: PressEntry[] = [];
      let totalGlueBarrels = 0;
      let totalMaintMs = 0;
      let totalPauseMs = 0;

      doc.setFontSize(16);
      doc.text(`Production Log - ${dateStr}`, 14, 15);
      
      let curY = 25;

      sessList.forEach(sess => {
        const opName = sess.operator?.name || "Unknown";
        
        doc.setFontSize(11);
        doc.setTextColor(50);
        doc.text(`Operator: ${opName}   |   Start: ${sess.startTime ? new Date(sess.startTime).toLocaleTimeString() : '--'}   |   Stop: ${sess.stopTime ? new Date(sess.stopTime).toLocaleTimeString() : '--'}`, 14, curY);
        curY += 6;

        if (sess.entries?.length > 0) {
          const listRows: any[][] = [];
          let slNo = 1;
          sess.entries.forEach(entry => {
            allEntries.push(entry);
            listRows.push([
              slNo++,
              entry.type,
              entry.category?.name || "N/A",
              `${entry.thickness.value}mm`,
              `${entry.size.length}x${entry.size.width}`,
              entry.quantity,
              cookingTime(entry)
            ]);
          });
          autoTable(doc, {
            startY: curY,
            head: [["Sl.No", "Type", "Category", "Thickness", "Size", "Qty", "Cook Time"]],
            body: listRows,
            theme: "grid",
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 41, 59] } // slate-800
          });
          curY = (doc as any).lastAutoTable.finalY + 6;
        }

        if (sess.glueEntries?.length > 0) {
          const glueRows = sess.glueEntries.map(g => {
            totalGlueBarrels += g.barrels;
            return [g.time ? new Date(g.time).toLocaleTimeString() : '--', g.barrels];
          });
          doc.setFontSize(10);
          doc.text("Glue Inputs", 14, curY);
          autoTable(doc, {
            startY: curY + 2,
            head: [["Time", "Barrels"]],
            body: glueRows,
            theme: "grid",
            styles: { fontSize: 8 },
            headStyles: { fillColor: [14, 165, 233] }, // sky-500
            margin: { left: 14 },
            tableWidth: 80
          });
          curY = (doc as any).lastAutoTable.finalY + 6;
        }

        if (sess.pauseEvents?.length > 0) {
          const pRows = sess.pauseEvents.map(p => {
             const start = new Date(p.startTime);
             const end = p.endTime ? new Date(p.endTime) : new Date();
             const durMs = end.getTime() - start.getTime();
             if (p.type === "MAINTENANCE") totalMaintMs += durMs;
             else totalPauseMs += durMs;
             return [
               p.type,
               start.toLocaleTimeString(),
               p.endTime ? end.toLocaleTimeString() : 'Ongoing',
               durStr(durMs),
               p.notes || ''
             ];
          });
          doc.setFontSize(10);
          doc.text("Pause & Maintenance", 14, curY);
          autoTable(doc, {
            startY: curY + 2,
            head: [["Type", "Start Time", "End Time", "Duration", "Notes"]],
            body: pRows,
            theme: "grid",
            styles: { fontSize: 8 },
            headStyles: { fillColor: [245, 158, 11] }, // amber-500
            margin: { left: 14 },
            tableWidth: 150
          });
          curY = (doc as any).lastAutoTable.finalY + 10;
        } else {
             curY += 4;
        }
      });

      // Daily Production Summary
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Production Summary - ${dateStr}`, 14, curY);
      
      let totalDocSqft = 0;
      const summaryList = buildSummaryMap(allEntries);
      const summaryRows = summaryList.map(s => {
        totalDocSqft += s.totalSqft;
        return [
          s.category,
          `${s.thickness}mm`,
          s.size,
          s.cookCount.toString(),
          s.totalQty.toString(),
          s.totalSqft.toFixed(1)
        ];
      });

      autoTable(doc, {
        startY: curY + 4,
        head: [["Category", "Thickness", "Size", "Total Cooks", "Total Quantity", "Total Sq.Ft"]],
        body: summaryRows,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [45, 133, 115] } // emerald tone
      });
      curY = (doc as any).lastAutoTable.finalY + 10;

      // Aggregates
      doc.setFontSize(12);
      doc.text("Daily Aggregates", 14, curY);
      autoTable(doc, {
        startY: curY + 4,
        head: [["Metric", "Value"]],
        body: [
          ["Total Square Feet", totalDocSqft.toFixed(1)],
          ["Total Glue Used", `${totalGlueBarrels} bbl`],
          ["Total Maintenance", durStr(totalMaintMs)],
          ["Total Pause", durStr(totalPauseMs)],
        ],
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] }, // slate-600
        margin: { left: 14 },
        tableWidth: 100
      });
    });

    doc.save(`Production_Log_${fromDate}_to_${toDate}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download size={20} className="text-blue-400" />
            Download Logs
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Date Range</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleRangeChange("YESTERDAY")} className={`py-2 text-xs font-semibold rounded-lg border ${rangeType === "YESTERDAY" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"}`}>Yesterday</button>
              <button onClick={() => handleRangeChange("THIS_WEEK")} className={`py-2 text-xs font-semibold rounded-lg border ${rangeType === "THIS_WEEK" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"}`}>This Week</button>
              <button onClick={() => handleRangeChange("CUSTOM")} className={`py-2 text-xs font-semibold rounded-lg border ${rangeType === "CUSTOM" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"}`}>Custom</button>
            </div>

            {rangeType === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm outline-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFormat("XLSX")} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${format === "XLSX" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"}`}>
                <FileSpreadsheet size={28} className="mb-2" />
                <span className="text-sm font-bold">Excel (.xlsx)</span>
              </button>
              <button onClick={() => setFormat("PDF")} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${format === "PDF" ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"}`}>
                <FileText size={28} className="mb-2" />
                <span className="text-sm font-bold">PDF Report</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button onClick={onClose} disabled={isDownloading} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition">Cancel</button>
          <button onClick={handleDownload} disabled={isDownloading || !fromDate || !toDate} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isDownloading ? "Generating..." : "Download Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
