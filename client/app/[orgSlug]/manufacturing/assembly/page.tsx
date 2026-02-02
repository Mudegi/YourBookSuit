"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type BomOption = {
  id: string;
  name: string;
  version?: string;
  productId?: string;
  productSku?: string;
  productName?: string;
};

type ProductOption = {
  id: string;
  sku?: string;
  name?: string;
};

type AssemblyRow = {
  id: string;
  assemblyNumber?: string;
  finishedProduct?: { id: string; sku?: string; name?: string } | null;
  quantity?: number;
  totalManufacturingCost?: number;
  newUnitCost?: number;
  status?: string;
  createdAt?: string;
};

type OrgInfo = {
  id: string;
  name?: string;
  homeCountry?: string;
  package?: 'PRO' | 'ADVANCED';
};

export default function AssemblyPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [boms, setBoms] = useState<BomOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyRow[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    bomId: "",
    finishedProductId: "",
    quantity: 1,
    assemblyDate: "",
    laborCost: "",
    overheadCost: "",
    wastageQuantity: "",
    wastageReasons: "",
    wastageDescription: "",
    notes: "",
    attachments: "",
    materialCostEstimate: "",
    exciseRate: "",
  });

  const isUganda = (orgInfo?.homeCountry || "").toUpperCase() === "UG";

  const loadBoms = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/boms`);
      if (res.ok) {
        const json = await res.json();
        setBoms(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/products?limit=100`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssemblies = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/manufacturing/assembly?limit=10`);
      if (res.ok) {
        const json = await res.json();
        setAssemblies(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrg = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const json = await res.json();
        const org = json.data?.organization || null;
        setOrgInfo(org);
        return org as OrgInfo | null;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await loadOrg();
      if (org?.package === 'PRO') {
        setBoms([]);
        setProducts([]);
        setAssemblies([]);
        return;
      }
      await Promise.all([loadBoms(), loadProducts(), loadAssemblies()]);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) loadAll();
  }, [orgSlug]);

  const totalMaterial = Number(form.materialCostEstimate) || 0;
  const labor = Number(form.laborCost) || 0;
  const overhead = Number(form.overheadCost) || 0;
  const quantity = Number(form.quantity) || 0;
  const wastageQty = Number(form.wastageQuantity) || 0;
  const exciseRate = Number(form.exciseRate) || 0;

  const totals = useMemo(() => {
    const totalCost = totalMaterial + labor + overhead;
    const unitCost = quantity > 0 ? totalCost / quantity : 0;
    const exciseDuty = isUganda && exciseRate > 0 ? totalCost * (exciseRate / 100) : 0;
    return { totalCost, unitCost, exciseDuty };
  }, [totalMaterial, labor, overhead, quantity, exciseRate, isUganda]);

  const glPreview = useMemo(() => {
    const entries = [] as { account: string; type: "DEBIT" | "CREDIT"; amount: number }[];
    if (totals.totalCost > 0) {
      entries.push({ account: "Finished Goods Inventory", type: "DEBIT", amount: totals.totalCost });
    }
    if (totalMaterial > 0) {
      entries.push({ account: "Raw Materials Inventory", type: "CREDIT", amount: totalMaterial });
    }
    if (labor > 0) {
      entries.push({ account: "Labor Applied", type: "CREDIT", amount: labor });
    }
    if (overhead > 0) {
      entries.push({ account: "Overhead Applied", type: "CREDIT", amount: overhead });
    }
    if (totals.exciseDuty > 0) {
      entries.push({ account: "Excise Duty Payable", type: "DEBIT", amount: totals.exciseDuty });
    }
    return entries;
  }, [labor, overhead, totalMaterial, totals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        bomId: form.bomId,
        finishedProductId: form.finishedProductId,
        quantity: Number(form.quantity),
        assemblyDate: form.assemblyDate ? new Date(form.assemblyDate).toISOString() : undefined,
        laborCost: form.laborCost ? Number(form.laborCost) : undefined,
        overheadCost: form.overheadCost ? Number(form.overheadCost) : undefined,
        wastageQuantity: form.wastageQuantity ? Number(form.wastageQuantity) : undefined,
        wastageReasons: form.wastageReasons
          ? form.wastageReasons.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        wastageDescription: form.wastageDescription || undefined,
        notes: form.notes || undefined,
        attachments: form.attachments
          ? form.attachments.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      const res = await fetch(`/api/${orgSlug}/manufacturing/assembly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create assembly");
      }

      const json = await res.json();
      setSuccess(`Assembly posted. New unit cost: ${json.newUnitCost ?? "n/a"}`);
      await loadAssemblies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assembly");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assembly Builds</h1>
        <p className="text-gray-600">Execute build assemblies, preview cost rollup, and post to GL.</p>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-700">{success}</div>}

      {orgInfo?.package === 'PRO' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold text-blue-900">Assembly builds require YourBooks Advanced</h2>
          <p className="text-blue-800">Upgrade to unlock manufacturing, projects, automation, and more.</p>
          <div className="flex justify-center gap-3">
            <a href={`/${orgSlug}/settings`} className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              Upgrade Now
            </a>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-md p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col text-sm font-medium text-gray-700">
                BOM
                <select
                  className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                  value={form.bomId}
                  onChange={(e) => setForm({ ...form, bomId: e.target.value })}
                  required
                >
                  <option value="">Select BOM</option>
                  {boms.map((bom) => (
                    <option key={bom.id} value={bom.id}>
                      {bom.name} {bom.version ? `v${bom.version}` : ""} {bom.productSku ? `- ${bom.productSku}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm font-medium text-gray-700">
                Finished product
                <select
                  className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                  value={form.finishedProductId}
                  onChange={(e) => setForm({ ...form, finishedProductId: e.target.value })}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `${p.sku} - ` : ""}{p.name || "Product"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Quantity to build
            <input
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Assembly date
            <input
              type="date"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.assemblyDate}
              onChange={(e) => setForm({ ...form, assemblyDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Estimated material cost (total)
            <input
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.materialCostEstimate}
              onChange={(e) => setForm({ ...form, materialCostEstimate: e.target.value })}
              placeholder="For preview only"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Labor cost (total)
            <input
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.laborCost}
              onChange={(e) => setForm({ ...form, laborCost: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Overhead cost (total)
            <input
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.overheadCost}
              onChange={(e) => setForm({ ...form, overheadCost: e.target.value })}
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Wastage quantity
            <input
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.wastageQuantity}
              onChange={(e) => setForm({ ...form, wastageQuantity: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Wastage reasons (comma separated)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.wastageReasons}
              onChange={(e) => setForm({ ...form, wastageReasons: e.target.value })}
              placeholder="Example: NORMAL_SCRAP, TRIMMING"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Wastage description
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.wastageDescription}
              onChange={(e) => setForm({ ...form, wastageDescription: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Notes
            <textarea
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional build notes"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Attachments (comma separated URLs)
            <input
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.attachments}
              onChange={(e) => setForm({ ...form, attachments: e.target.value })}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Excise rate (%) {isUganda ? "(Uganda detected)" : "(optional)"}
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
              value={form.exciseRate}
              onChange={(e) => setForm({ ...form, exciseRate: e.target.value })}
              placeholder="Set to 35 for spirits, 20 for beer, 10 for plastics"
            />
          </label>
          <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
            Cost preview uses your inputs only; final postings use backend calculations per BOM, inventory, and GL rules.
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Total cost preview: <span className="font-semibold">{totals.totalCost.toFixed(2)}</span> | Unit cost preview: <span className="font-semibold">{totals.unitCost.toFixed(4)}</span> {totals.exciseDuty > 0 ? `| Excise duty: ${totals.exciseDuty.toFixed(2)}` : ""}
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Post assembly
          </button>
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm space-y-3">
        {glPreview.length === 0 ? (
          <div className="text-sm text-gray-600">Enter cost estimates to preview journal entries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3">Account</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {glPreview.map((entry, idx) => (
                  <tr key={`${entry.account}-${idx}`} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-800">{entry.account}</td>
                    <td className="py-2 pr-3 text-gray-700">{entry.type}</td>
                    <td className="py-2 pr-3 text-gray-900">{entry.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Recent assemblies</h2>
        {assemblies.length === 0 ? (
          <div className="text-sm text-gray-600">No assemblies yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3">Assembly #</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Quantity</th>
                  <th className="py-2 pr-3">Total Cost</th>
                  <th className="py-2 pr-3">Unit Cost</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {assemblies.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-800">{a.assemblyNumber || a.id}</td>
                    <td className="py-2 pr-3 text-gray-700">
                      {a.finishedProduct?.sku ? `${a.finishedProduct.sku} - ` : ""}
                      {a.finishedProduct?.name || "Finished good"}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{a.quantity ?? ""}</td>
                    <td className="py-2 pr-3 text-gray-900">{a.totalManufacturingCost ?? ""}</td>
                    <td className="py-2 pr-3 text-gray-900">{a.newUnitCost ?? ""}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.status || ""}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
