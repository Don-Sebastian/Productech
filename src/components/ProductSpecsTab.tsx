"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Save, Check, Settings, ExternalLink, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductSpecsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: catalog = { categories: [], thicknesses: [] } } = useQuery({
    queryKey: ["catalog-for-specs"],
    queryFn: () => fetch("/api/catalog").then((res) => res.json()),
  });

  const { data: specs = [], isLoading: loadingSpecs } = useQuery({
    queryKey: ["product-specs"],
    queryFn: () => fetch("/api/product-specs").then((res) => res.json()),
  });

  const saveSpec = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/product-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-specs"] });
      queryClient.invalidateQueries({ queryKey: ["manager-catalog"] });
    },
  });

  // State to track edits per "categoryId-thicknessId"
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");
  const [editingSpecs, setEditingSpecs] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | "error" | null>>({});

  const categories = catalog.categories || [];
  const thicknesses = catalog.thicknesses || [];

  // Build matrix of all combinations
  const combinations = useMemo(() => {
    const list: Array<{
      categoryId: string;
      categoryName: string;
      thicknessId: string;
      thicknessVal: number;
      thicknessUnit: string;
      spec?: any;
    }> = [];

    categories.forEach((cat: any) => {
      thicknesses.forEach((thick: any) => {
        const spec = specs.find(
          (s: any) => s.categoryId === cat.id && s.thicknessId === thick.id
        );
        list.push({
          categoryId: cat.id,
          categoryName: cat.name,
          thicknessId: thick.id,
          thicknessVal: thick.value,
          thicknessUnit: thick.unit || "mm",
          spec,
        });
      });
    });

    return list;
  }, [categories, thicknesses, specs]);

  const filteredCombinations = useMemo(() => {
    if (selectedCatId === "ALL") return combinations;
    return combinations.filter((c) => c.categoryId === selectedCatId);
  }, [combinations, selectedCatId]);

  const handleEdit = (key: string, field: string, value: string) => {
    setEditingSpecs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const getDisplayValue = (categoryId: string, thicknessId: string, field: string) => {
    const key = `${categoryId}-${thicknessId}`;
    if (editingSpecs[key] && editingSpecs[key][field] !== undefined) {
      return editingSpecs[key][field];
    }
    const spec = specs.find((s: any) => s.categoryId === categoryId && s.thicknessId === thicknessId);
    return spec ? (spec[field] !== undefined && spec[field] !== null ? String(spec[field]) : "") : "";
  };

  const handleSave = async (categoryId: string, thicknessId: string) => {
    const key = `${categoryId}-${thicknessId}`;
    const editData = editingSpecs[key] || {};
    const existingSpec = specs.find((s: any) => s.categoryId === categoryId && s.thicknessId === thicknessId) || {};

    const weightPerSheetKg = editData.weightPerSheetKg !== undefined ? editData.weightPerSheetKg : existingSpec.weightPerSheetKg ?? "";
    const longCore = editData.longCore !== undefined ? editData.longCore : existingSpec.longCore ?? "";
    const glueCore = editData.glueCore !== undefined ? editData.glueCore : existingSpec.glueCore ?? "";

    if (weightPerSheetKg === "" || longCore === "" || glueCore === "") {
      alert("Please fill all required fields: Avg Weight (KG), Long Core, and Glue Core");
      setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
      return;
    }

    setSaveStatus((prev) => ({ ...prev, [key]: "saving" }));

    try {
      await saveSpec.mutateAsync({
        categoryId,
        thicknessId,
        weightPerSheetKg: parseFloat(weightPerSheetKg) || 0,
        longCore: parseInt(longCore, 10) || 0,
        glueCore: parseInt(glueCore, 10) || 0,
      });

      setSaveStatus((prev) => ({ ...prev, [key]: "saved" }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [key]: null }));
      }, 2000);
    } catch (e) {
      setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      {/* Header with quick navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="text-cyan-400" size={26} /> Plywood Specifications & Core Details
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Category & thickness specifications for sheet weight, Long Core, and Glue Core. Total Plies = Long Core + Glue Core.
          </p>
        </div>

        <button
          onClick={() => router.push("/manager/settings/catalog?tab=thicknesses")}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition active:scale-[0.98] self-start md:self-auto"
        >
          <Settings size={14} /> Manage in Catalog Settings <ExternalLink size={12} />
        </button>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter size={12} /> Category:
          </span>
          <button
            onClick={() => setSelectedCatId("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCatId === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            All Categories ({combinations.length})
          </button>
          {categories.map((cat: any) => {
            const count = combinations.filter((c) => c.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCatId === cat.id
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Specifications Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="pb-3 pr-4 font-bold">Category</th>
              <th className="pb-3 px-4 font-bold">Thickness</th>
              <th className="pb-3 px-4 font-bold">Avg Weight (KG)</th>
              <th className="pb-3 px-4 font-bold">Long Core</th>
              <th className="pb-3 px-4 font-bold">Glue Core</th>
              <th className="pb-3 px-4 font-bold">Total Plies (LC + GC)</th>
              <th className="pb-3 pl-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCombinations.map((item) => {
              const key = `${item.categoryId}-${item.thicknessId}`;
              const weight = getDisplayValue(item.categoryId, item.thicknessId, "weightPerSheetKg");
              const longCoreVal = getDisplayValue(item.categoryId, item.thicknessId, "longCore");
              const glueCoreVal = getDisplayValue(item.categoryId, item.thicknessId, "glueCore");
              const isEdited = editingSpecs[key] !== undefined;
              const status = saveStatus[key];

              const lc = parseInt(longCoreVal, 10) || 0;
              const gc = parseInt(glueCoreVal, 10) || 0;
              const totalPlies = (longCoreVal !== "" || glueCoreVal !== "") ? (lc + gc) : null;
              const isConfigured = Boolean(item.spec);

              return (
                <tr
                  key={key}
                  className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="py-4 pr-4">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-xs">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-white font-extrabold text-sm">
                      {item.thicknessVal} <span className="text-slate-400 text-xs font-medium">{item.thicknessUnit}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 27"
                      value={weight}
                      onChange={(e) => handleEdit(key, "weightPerSheetKg", e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white font-bold text-sm outline-none focus:border-cyan-500 transition"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 8"
                      value={longCoreVal}
                      onChange={(e) => handleEdit(key, "longCore", e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white font-bold text-sm outline-none focus:border-cyan-500 transition"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 7"
                      value={glueCoreVal}
                      onChange={(e) => handleEdit(key, "glueCore", e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white font-bold text-sm outline-none focus:border-cyan-500 transition"
                    />
                  </td>
                  <td className="py-4 px-4">
                    {totalPlies !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-black">
                          {totalPlies} Plies
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          ({lc} LC + {gc} GC)
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs italic">Not configured</span>
                    )}
                  </td>
                  <td className="py-4 pl-4 text-right">
                    {status === "saving" ? (
                      <span className="text-cyan-400 text-xs font-bold animate-pulse">Saving...</span>
                    ) : status === "saved" ? (
                      <span className="text-emerald-400 text-xs font-bold flex items-center justify-end gap-1">
                        <Check size={14} /> Saved
                      </span>
                    ) : isEdited ? (
                      <button
                        onClick={() => handleSave(item.categoryId, item.thicknessId)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-end gap-1.5 ml-auto shadow-md shadow-cyan-500/20 active:scale-[0.97] transition"
                      >
                        <Save size={14} /> Save
                      </button>
                    ) : isConfigured ? (
                      <span className="text-slate-500 text-xs font-semibold">Configured ✓</span>
                    ) : (
                      <span className="text-slate-600 text-xs italic">Pending setup</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredCombinations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <p className="font-semibold text-sm">No category/thickness combinations found.</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Add categories and thicknesses in Company Settings &gt; Product Catalog first.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
