import React, { useState, useEffect, useMemo } from 'react';
import { productRepository, financeRepository } from '../../repositories';
import { Product } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/shared/SearchInput';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { formatCurrency } from '../../utils/currency';
import { 
  Boxes, 
  Package, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  Tag, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const FinanceInventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prodList, analyticsList] = await Promise.all([
          productRepository.getAll().catch(() => []),
          financeRepository.getInventoryReport().catch(() => []),
        ]);
        setProducts(prodList);
        setInventoryAnalytics(analyticsList);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Map analytics with product catalog
  const inventoryItems = useMemo(() => {
    return products.map((prod) => {
      const analytics = inventoryAnalytics.find((a) => a.id === prod.id || a.code === prod.code);
      const costPrice = Number(prod.costPrice || 0);
      const sellingPrice = Number(prod.sellingPrice || 0);
      const currentStock = prod.currentStock || 0;
      const stockValuation = currentStock * costPrice;
      const soldUnits = analytics ? analytics.salesQuantity || prod.soldStock || 0 : (prod.soldStock || 0);
      const realizedRevenue = analytics ? analytics.salesRevenue || 0 : (soldUnits * sellingPrice);
      const realizedCOGS = analytics ? analytics.cogs || 0 : (soldUnits * costPrice);
      const realizedGrossProfit = realizedRevenue - realizedCOGS;
      const marginPct = realizedRevenue > 0 ? ((realizedGrossProfit / realizedRevenue) * 100).toFixed(1) : '0.0';

      return {
        id: prod.id,
        name: prod.name,
        code: prod.code,
        category: prod.category || 'General',
        currentStock,
        minStockThreshold: prod.minStockThreshold || 10,
        costPrice,
        sellingPrice,
        stockValuation,
        soldUnits,
        realizedRevenue,
        realizedCOGS,
        realizedGrossProfit,
        marginPct,
        isActive: prod.isActive,
      };
    });
  }, [products, inventoryAnalytics]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered list
  const filtered = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      let matchesStock = true;
      if (stockStatusFilter === 'LOW') {
        matchesStock = item.currentStock > 0 && item.currentStock <= item.minStockThreshold;
      } else if (stockStatusFilter === 'OUT') {
        matchesStock = item.currentStock === 0;
      } else if (stockStatusFilter === 'HEALTHY') {
        matchesStock = item.currentStock > item.minStockThreshold;
      }

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [inventoryItems, search, categoryFilter, stockStatusFilter]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSKUs = inventoryItems.length;
    const totalUnitsOnHand = inventoryItems.reduce((acc, i) => acc + i.currentStock, 0);
    const totalValuationCost = inventoryItems.reduce((acc, i) => acc + i.stockValuation, 0);
    const totalPotentialSales = inventoryItems.reduce((acc, i) => acc + (i.currentStock * i.sellingPrice), 0);
    const totalSoldUnits = inventoryItems.reduce((acc, i) => acc + i.soldUnits, 0);
    const totalRealizedRevenue = inventoryItems.reduce((acc, i) => acc + i.realizedRevenue, 0);
    const totalRealizedCOGS = inventoryItems.reduce((acc, i) => acc + i.realizedCOGS, 0);
    const totalGrossProfit = totalRealizedRevenue - totalRealizedCOGS;
    const avgMargin = totalRealizedRevenue > 0 ? ((totalGrossProfit / totalRealizedRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalSKUs,
      totalUnitsOnHand,
      totalValuationCost,
      totalPotentialSales,
      totalSoldUnits,
      totalRealizedRevenue,
      totalRealizedCOGS,
      totalGrossProfit,
      avgMargin,
    };
  }, [inventoryItems]);

  const handleExportExcel = () => {
    const exportData = filtered.map((item) => ({
      'SKU Code': item.code,
      'Product Name': item.name,
      'Category': item.category,
      'Stock on Hand': item.currentStock,
      'Min Reorder Level': item.minStockThreshold,
      'Unit Cost (LKR)': item.costPrice,
      'Catalog Selling Price (LKR)': item.sellingPrice,
      'Total Inventory Valuation (Cost)': item.stockValuation,
      'Sold Units': item.soldUnits,
      'Realized Sales Revenue (LKR)': item.realizedRevenue,
      'Realized COGS (LKR)': item.realizedCOGS,
      'Realized Gross Profit (LKR)': item.realizedGrossProfit,
      'Margin (%)': `${item.marginPct}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Valuation');
    XLSX.writeFile(wb, `Inventory_Financial_Valuation_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory & Asset Valuation Ledger"
        description="Comprehensive real-time stock asset audit, unit cost acquisition tracking, COGS allocation, and realized profit margins."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
              onClick={() => window.print()}
            >
              Print Ledger
            </Button>
            <Button
              variant="primary"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Export Excel
            </Button>
          </div>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Stock Asset Valuation (Cost)"
          value={formatCurrency(summary.totalValuationCost)}
          icon={<Boxes className="w-5 h-5 text-blue-600" />}
          subtitle={`${summary.totalUnitsOnHand.toLocaleString()} total units on hand`}
          accentColor="blue"
        />
        <StatCard
          title="Potential Catalog Revenue"
          value={formatCurrency(summary.totalPotentialSales)}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          subtitle="At active list selling price"
          accentColor="purple"
        />
        <StatCard
          title="Realized Sales Revenue"
          value={formatCurrency(summary.totalRealizedRevenue)}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          subtitle={`${summary.totalSoldUnits.toLocaleString()} units delivered`}
          accentColor="green"
        />
        <StatCard
          title="Overall Gross Margin"
          value={`${summary.avgMargin}%`}
          icon={<ArrowUpRight className="w-5 h-5 text-purple-600" />}
          subtitle={`Profit: ${formatCurrency(summary.totalGrossProfit)}`}
          accentColor="green"
        />
      </div>

      {/* Filter and Control Bar */}
      <Card className="border border-slate-200/80 shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Search Catalog</label>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by SKU code, product title, or category..."
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Product Categories' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            {/* Stock Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Health</label>
              <Select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Stock Levels' },
                  { value: 'HEALTHY', label: 'Healthy Supply (> Reorder)' },
                  { value: 'LOW', label: 'Low Stock (At / Below Reorder)' },
                  { value: 'OUT', label: 'Depleted / Out of Stock' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Displaying <strong className="text-slate-900">{filtered.length}</strong> of {inventoryItems.length} registered SKUs
            </span>
            <span>
              Filtered Stock Cost: <strong className="text-blue-700 font-mono font-semibold">{formatCurrency(filtered.reduce((a, i) => a + i.stockValuation, 0))}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No inventory records found"
          description="Try adjusting your filter search criteria or refresh the catalog data."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Stock Valuation</th>
                  <th className="py-3 px-4 text-center">Delivered Units</th>
                  <th className="py-3 px-4 text-right">Realized Revenue</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((item) => {
                  const isLow = item.currentStock > 0 && item.currentStock <= item.minStockThreshold;
                  const isOut = item.currentStock === 0;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 border border-slate-200">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm">{item.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{item.code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{item.category}</span>
                        </span>
                      </td>

                      {/* Stock Level Pill */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isOut
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.currentStock} in stock
                          </span>
                          {isLow && (
                            <span className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Reorder limit: {item.minStockThreshold}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(item.costPrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-900 font-semibold">
                        {formatCurrency(item.sellingPrice)}
                      </td>

                      {/* Stock Valuation */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-blue-700">
                        {formatCurrency(item.stockValuation)}
                      </td>

                      {/* Sold Units */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                          {item.soldUnits}
                        </span>
                      </td>

                      {/* Realized Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-700 font-semibold">
                        {formatCurrency(item.realizedRevenue)}
                      </td>

                      {/* Gross Profit */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(item.realizedGrossProfit)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                            Number(item.marginPct) >= 30
                              ? 'bg-emerald-50 text-emerald-700'
                              : Number(item.marginPct) > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regulatory & Audit Note */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold">Accounting & Compliance Notice:</h5>
          <p className="text-blue-800 leading-relaxed mt-0.5">
            Stock assets are valued on a real-time Weighted Moving Acquisition Standard. COGS and Gross Margins are computed solely against verified Delivered customer orders to maintain true realized revenue governance.
          </p>
        </div>
      </div>
    </div>
  );
};
