import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Product, StockActivityLog, ApprovalRequest, User } from '../../models/domain';
import { productRepository, stockActivityLogRepository, approvalRequestRepository, emailNotificationRepository, userRepository, orderRepository, customerRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { Package, PlusCircle, DollarSign, AlertTriangle, Clock, CheckCircle2, XCircle, History, Send, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export const SupervisorStockPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [stockLogs, setStockLogs] = useState<StockActivityLog[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Stock Addition Modal
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState<number>(50);
  const [stockBatchCost, setStockBatchCost] = useState<number>(0);
  const [stockProposedSellingPrice, setStockProposedSellingPrice] = useState<number>(0);
  const [stockPricingMode, setStockPricingMode] = useState<'GLOBAL' | 'BATCH_SPECIFIC'>('GLOBAL');
  const [stockBatchNumber, setStockBatchNumber] = useState<string>('');
  const [stockSupplier, setStockSupplier] = useState<string>('');
  const [stockReason, setStockReason] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Request Price Change Modal
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState<string>('');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  // Bulk Multi-Product Stock Addition Modal (Requirement 1)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkQuantities, setBulkQuantities] = useState<Record<string, number>>({});
  const [bulkBatchCosts, setBulkBatchCosts] = useState<Record<string, number>>({});
  const [bulkProposedPrices, setBulkProposedPrices] = useState<Record<string, number>>({});
  const [bulkPricingModes, setBulkPricingModes] = useState<Record<string, 'GLOBAL' | 'BATCH_SPECIFIC'>>({});
  const [bulkReason, setBulkReason] = useState<string>('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Report Damaged Stock Modal State
  const [damageModalProduct, setDamageModalProduct] = useState<Product | null>(null);
  const [damageQty, setDamageQty] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('');
  const [isSubmittingDamage, setIsSubmittingDamage] = useState(false);

  // Damage Stock Audit Inspection State
  const [inspectingDamageProduct, setInspectingDamageProduct] = useState<Product | null>(null);
  const [damageAuditRecords, setDamageAuditRecords] = useState<any[]>([]);
  const [loadingDamageAudit, setLoadingDamageAudit] = useState(false);

  // Critical Action Confirmation States
  const [confirmingStockSubmit, setConfirmingStockSubmit] = useState(false);
  const [confirmingPriceSubmit, setConfirmingPriceSubmit] = useState(false);
  const [confirmingBulkSubmit, setConfirmingBulkSubmit] = useState(false);

  // Stock Filter Tab State
  const [activeTab, setActiveTab] = useState<'ALL' | 'AVAILABLE' | 'ALLOCATED' | 'DISPATCHED' | 'SOLD' | 'DAMAGED'>('ALL');

  const loadData = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const [teamProducts, logs, requests] = await Promise.all([
        productRepository.getByTeamId(user.teamId),
        stockActivityLogRepository.getByTeamId(user.teamId),
        approvalRequestRepository.getByTeamId(user.teamId),
      ]);

      setProducts(teamProducts);
      setStockLogs(logs);
      setApprovalRequests(requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openBulkModal = () => {
    const initialQty: Record<string, number> = {};
    const initialCosts: Record<string, number> = {};
    const initialPrices: Record<string, number> = {};
    const initialModes: Record<string, 'GLOBAL' | 'BATCH_SPECIFIC'> = {};

    products.forEach((p) => {
      initialQty[p.id] = 0;
      initialCosts[p.id] = p.costPrice;
      initialPrices[p.id] = p.sellingPrice;
      initialModes[p.id] = 'GLOBAL';
    });
    setBulkQuantities(initialQty);
    setBulkBatchCosts(initialCosts);
    setBulkProposedPrices(initialPrices);
    setBulkPricingModes(initialModes);
    setBulkReason('');
    setIsBulkModalOpen(true);
  };

  // Open Single Stock Addition Modal with defaults
  const openStockModal = (product: Product) => {
    setStockModalProduct(product);
    setAddQty(50);
    setStockBatchCost(product.costPrice);
    setStockProposedSellingPrice(product.sellingPrice);
    setStockPricingMode('GLOBAL');
    setStockBatchNumber(`BAT-${Date.now().toString().slice(-6)}`);
    setStockSupplier('');
    setStockReason('');
  };

  // Bulk Multi-Product Stock Addition Submit
  const handleRequestBulkStockAddition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const itemsToAdd = products
      .filter((p) => (bulkQuantities[p.id] || 0) > 0)
      .map((p) => {
        const rawCost = bulkBatchCosts[p.id] !== undefined && bulkBatchCosts[p.id] !== null ? bulkBatchCosts[p.id] : p.costPrice;
        const rawPrice = bulkProposedPrices[p.id] !== undefined && bulkProposedPrices[p.id] !== null ? bulkProposedPrices[p.id] : p.sellingPrice;

        return {
          productId: p.id,
          productName: p.name,
          quantity: Number(bulkQuantities[p.id]),
          unitCostPrice: Number(parseFloat(String(rawCost)) || 0),
          proposedSellingPrice: Number(parseFloat(String(rawPrice)) || 0),
          pricingMode: bulkPricingModes[p.id] || 'GLOBAL',
          oldStock: Number(p.currentStock),
          newStock: Number(p.currentStock + bulkQuantities[p.id]),
        };
      });

    if (itemsToAdd.length === 0) {
      toast.error('Please enter additional stock quantity for at least one product.');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const totalQty = itemsToAdd.reduce((sum, item) => sum + item.quantity, 0);

      await approvalRequestRepository.create({
        requestType: 'STOCK_ADDITION',
        requestedById: user.id,
        requestedByName: user.fullName,
        teamId: user.teamId || 'team_001',
        productId: itemsToAdd[0]?.productId || undefined as any,
        productName: `Bulk Stock Addition (${itemsToAdd.length} Products, +${totalQty} Units)`,
        items: itemsToAdd,
        quantity: totalQty,
        reason: bulkReason || `Bulk stock addition request for ${itemsToAdd.length} products (+${totalQty} units total)`,
      });

      toast.success(`Submitted 1 bulk approval request for ${itemsToAdd.length} products to Admin.`);
      setIsBulkModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit bulk stock request.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Supervisor requests stock addition with batch cost & pricing mode
  const handleRequestStockAddition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct || !user || addQty <= 0) return;

    setIsSubmittingStock(true);
    try {
      await approvalRequestRepository.create({
        requestType: 'STOCK_ADDITION',
        requestedById: user.id,
        requestedByName: user.fullName,
        teamId: user.teamId || 'team_001',
        productId: stockModalProduct.id,
        productName: stockModalProduct.name,
        oldValue: Number(stockModalProduct.currentStock),
        newValue: Number(stockModalProduct.currentStock + addQty),
        quantity: Number(addQty),
        unitCostPrice: Number(parseFloat(String(stockBatchCost)) || 0),
        proposedSellingPrice: Number(parseFloat(String(stockProposedSellingPrice)) || 0),
        pricingMode: stockPricingMode,
        batchNumber: stockBatchNumber,
        supplierName: stockSupplier,
        reason: stockReason || `Stock addition +${addQty} units @ LKR ${stockBatchCost} (${stockPricingMode} pricing)`,
      });

      toast.success(`Submitted stock addition request (+${addQty} units @ LKR ${stockBatchCost}) for Admin approval.`);
      setStockModalProduct(null);
      setStockReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit stock request.');
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Requirement 2.12: Supervisor requests cost/selling price changes (Creates pending ApprovalRequest & sends email notification)
  const handleRequestPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalProduct || !user) return;

    setIsSubmittingPrice(true);
    try {
      let isCostChanged = newCostPrice !== priceModalProduct.costPrice;
      let isSellingChanged = newSellingPrice !== priceModalProduct.sellingPrice;

      if (!isCostChanged && !isSellingChanged) {
        toast.error('Please modify cost price or selling price.');
        setIsSubmittingPrice(false);
        return;
      }

      if (isCostChanged) {
        await approvalRequestRepository.create({
          requestType: 'PRODUCT_COST_PRICE_CHANGE',
          requestedById: user.id,
          requestedByName: user.fullName,
          teamId: user.teamId || 'team_001',
          productId: priceModalProduct.id,
          productName: priceModalProduct.name,
          oldValue: priceModalProduct.costPrice,
          newValue: newCostPrice,
          reason: priceReason || `Cost price change from LKR ${priceModalProduct.costPrice} to LKR ${newCostPrice}`,
        });
      }

      if (isSellingChanged) {
        await approvalRequestRepository.create({
          requestType: 'PRODUCT_SELLING_PRICE_CHANGE',
          requestedById: user.id,
          requestedByName: user.fullName,
          teamId: user.teamId || 'team_001',
          productId: priceModalProduct.id,
          productName: priceModalProduct.name,
          oldValue: priceModalProduct.sellingPrice,
          newValue: newSellingPrice,
          reason: priceReason || `Selling price change from LKR ${priceModalProduct.sellingPrice} to LKR ${newSellingPrice}`,
        });
      }

      // Requirement 2.12: System sends an email notification/reminder to administrator
      await emailNotificationRepository.create({
        orderId: `price_req_${Date.now()}`,
        customerId: `admin_notify`,
        recipientEmail: 'admin@crm.com',
        notificationType: 'DELIVERY_CONFIRMATION',
        status: 'SENT',
        reason: `Supervisor ${user.fullName} requested price changes for ${priceModalProduct.name}.`,
      });

      toast.success(`Submitted price change request for Admin approval & sent email notification.`);
      setPriceModalProduct(null);
      setPriceReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit price change request.');
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  // Open Damaged Stock Audit Inspection Modal
  const handleOpenDamageAudit = async (prod: Product) => {
    setInspectingDamageProduct(prod);
    setLoadingDamageAudit(true);
    try {
      const [allLogs, allOrders, allCustomers] = await Promise.all([
        stockActivityLogRepository.getByTeamId(prod.teamId).catch(() => []),
        orderRepository.getByTeamId(prod.teamId).catch(() => []),
        customerRepository.getAll().catch(() => []),
      ]);

      const custMap = new Map(allCustomers.map((c) => [c.id, c]));
      const records: any[] = [];

      // 1. Direct logs
      const productLogs = allLogs.filter(
        (l) => l.productId === prod.id && (l.action === 'REMOVE' || l.action === 'ADJUST')
      );
      productLogs.forEach((l) => {
        records.push({
          id: l.id,
          source: 'STOCK_ADJUSTMENT',
          date: l.createdAt,
          quantity: l.quantity,
          reason: `Stock log ${l.action}`,
          performedByName: l.performedByName || 'Supervisor',
        });
      });

      // 2. Orders that logged damaged items
      allOrders.forEach((ord) => {
        const hasDamaged =
          (ord.damagedItems &&
            ord.damagedItems.some(
              (item) => item.productId === prod.id || item.productName.toLowerCase() === prod.name.toLowerCase()
            )) ||
          (ord.status === 'REJECTED' &&
            (ord.remarks?.toLowerCase().includes(prod.name.toLowerCase()) ||
              ord.remarks?.toLowerCase().includes('damage')));

        if (hasDamaged) {
          const cust = custMap.get(ord.customerId);
          const matchedDamagedItem = ord.damagedItems?.find(
            (item) => item.productId === prod.id || item.productName.toLowerCase() === prod.name.toLowerCase()
          );

          records.push({
            id: `ord_${ord.id}`,
            source: 'ORDER_RETURN',
            orderNumber: `#${ord.orderNumber}`,
            orderStatus: ord.status,
            customerName: cust?.fullName || 'Customer',
            customerPhone: cust?.phone,
            customerCity: cust?.city || 'Sri Lanka',
            date: ord.rejectedAt || ord.updatedAt || ord.createdAt,
            quantity: matchedDamagedItem?.quantity || 1,
            reason:
              matchedDamagedItem?.reason ||
              ord.remarks ||
              'Customer refused package - returned damaged during transit',
            performedByName: 'Courier Return / Status Update',
          });
        }
      });

      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDamageAuditRecords(records);
    } catch {
      toast.error('Failed to load damage audit logs.');
    } finally {
      setLoadingDamageAudit(false);
    }
  };

  // Supervisor reports damaged / broken units
  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageModalProduct || damageQty <= 0) return;
    setIsSubmittingDamage(true);
    try {
      await productRepository.reportDamage(damageModalProduct.id, damageQty, damageReason);
      toast.success(`Recorded ${damageQty} damaged units for "${damageModalProduct.name}".`);
      setDamageModalProduct(null);
      setDamageReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to report damaged stock.');
    } finally {
      setIsSubmittingDamage(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockThreshold).length;
  const pendingRequestsCount = approvalRequests.filter((r) => r.status === 'PENDING').length;

  const filteredProducts = products.filter((p) => {
    switch (activeTab) {
      case 'AVAILABLE': return p.currentStock > 0;
      case 'ALLOCATED': return (p.allocatedStock || 0) > 0;
      case 'DISPATCHED': return (p.dispatchedStock || 0) > 0;
      case 'SOLD': return (p.soldStock || 0) > 0;
      case 'DAMAGED': return (p.damagedStock || 0) > 0;
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Inventory Management"
        description="Monitor team-specific product stock, request inventory additions, and request price adjustments"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={openBulkModal}
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs"
          >
            Bulk Add Stock Request
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Team Products"
          value={products.length}
          subtitle="Products assigned to your team"
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Products below minimum threshold"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequestsCount}
          subtitle="Awaiting Admin approval"
          icon={<Clock className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
      </div>

      {/* Product Stock Table */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Team Products Inventory</h3>
            <p className="text-xs text-slate-500">
              Only products assigned to your team are visible. Product creation is restricted to Admin only.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {['ALL', 'AVAILABLE', 'ALLOCATED', 'DISPATCHED', 'SOLD', 'DAMAGED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Products' : tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3 text-center">Available</th>
                <th className="py-3 px-3 text-center text-amber-600">Allocated</th>
                <th className="py-3 px-3 text-center text-blue-600">Dispatched</th>
                <th className="py-3 px-3 text-center text-emerald-600">Sold</th>
                <th className="py-3 px-3 text-center text-rose-600">Damaged</th>
                <th className="py-3 px-3">Price (LKR)</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400 text-xs">
                    No products found for your team.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.currentStock <= product.minStockThreshold;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <span>{product.name}</span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{product.code}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-900 text-sm font-mono">{product.currentStock}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-amber-700 text-sm font-mono">{product.allocatedStock || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-blue-700 text-sm font-mono">{product.dispatchedStock || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-700 text-sm font-mono">{product.soldStock || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-rose-700 text-sm font-mono">{product.damagedStock || 0}</span>
                          {(product.damagedStock || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenDamageAudit(product)}
                              className="mt-1 text-[9px] font-sans text-rose-600 underline"
                            >
                              Audit
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="text-slate-500 text-[10px]">Cost: {product.costPrice.toLocaleString()}</div>
                        <div className="font-bold text-emerald-600">Sell: {product.sellingPrice.toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<PlusCircle className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => openStockModal(product)}
                            className="text-xs px-2 py-1"
                            title="Request Stock Addition"
                          >
                            + Stock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<DollarSign className="w-3.5 h-3.5 text-slate-600" />}
                            onClick={() => {
                              setPriceModalProduct(product);
                              setNewCostPrice(product.costPrice);
                              setNewSellingPrice(product.sellingPrice);
                              setPriceReason('');
                            }}
                            className="text-xs px-2 py-1"
                            title="Request Price Change"
                          >
                            Edit Price
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            onClick={() => {
                              setDamageModalProduct(product);
                              setDamageQty(1);
                              setDamageReason('');
                            }}
                            className="text-xs px-2 py-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50"
                            title="Report Damaged / Broken Units"
                          >
                            Damage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Activity History & Approval Trail (Requirement 2.13) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending & Historical Approval Requests */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Approval Requests Sent to Admin</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {approvalRequests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">No approval requests logged yet.</div>
            ) : (
              approvalRequests.map((req) => (
                <div key={req.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="truncate">{req.productName} ({req.requestType.replace(/_/g, ' ')})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {req.requestType === 'STOCK_ADDITION' ? `Requesting +${req.quantity} units (Current: ${req.oldValue})` : `New Price Proposal: LKR ${req.newValue} (Old: LKR ${req.oldValue})`}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Reason: {req.reason}</span>
                    <span>{format(new Date(req.createdAt), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock Activity History Audit Feed */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Stock Activity & Movement Log</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {stockLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">No stock activity recorded.</div>
            ) : (
              stockLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg border border-slate-100 bg-white text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{log.productName}</span>
                    <span className="font-mono text-blue-600 font-bold">{log.action}</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Stock: {log.previousStock} → <strong>{log.newStock}</strong> (Performed by: {log.performedByName})
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stock Addition Request Modal (Requirement 2.10) */}
      <Dialog
        isOpen={!!stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        title="Request Stock Batch Addition"
        description="Submit incoming stock shipment with batch acquisition cost & pricing strategy for Admin approval"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingStockSubmit(true);
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-blue-900">{stockModalProduct?.name}</div>
            <div className="text-blue-700">
              Current Stock: <strong>{stockModalProduct?.currentStock} units</strong> | Reference Cost: <strong>LKR {stockModalProduct?.costPrice.toLocaleString()}</strong> | Catalog Price: <strong>LKR {stockModalProduct?.sellingPrice.toLocaleString()}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Shipment Quantity (+) *"
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
              required
            />
            <Input
              label="Batch Acquisition Cost (LKR) *"
              type="number"
              min="0"
              step="0.01"
              value={stockBatchCost}
              onChange={(e) => setStockBatchCost(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Proposed Selling Price (LKR) *"
              type="number"
              min="0"
              step="0.01"
              value={stockProposedSellingPrice}
              onChange={(e) => setStockProposedSellingPrice(parseFloat(e.target.value) || 0)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pricing Strategy
              </label>
              <select
                value={stockPricingMode}
                onChange={(e) => setStockPricingMode(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="GLOBAL">Global Price Change (Update entire catalog)</option>
                <option value="BATCH_SPECIFIC">Batch-Specific (Apply only to this shipment)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Batch / Lot Number (Optional)"
              placeholder="e.g. BAT-2026-001"
              value={stockBatchNumber}
              onChange={(e) => setStockBatchNumber(e.target.value)}
            />
            <Input
              label="Supplier / Invoice Ref (Optional)"
              placeholder="e.g. INV-9842"
              value={stockSupplier}
              onChange={(e) => setStockSupplier(e.target.value)}
            />
          </div>

          <Input
            label="Supervisor Reason / Justification *"
            placeholder="e.g. Received new shipment from supplier with updated wholesale cost"
            value={stockReason}
            onChange={(e) => setStockReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setStockModalProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingStock} leftIcon={<Send className="w-3.5 h-3.5" />}>
              Submit for Admin Approval
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Product Price Change Request Modal (Requirement 2.12) */}
      <Dialog
        isOpen={!!priceModalProduct}
        onClose={() => setPriceModalProduct(null)}
        title="Request Product Price Change"
        description="Submit proposed cost price or selling price adjustments for Admin approval"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingPriceSubmit(true);
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-slate-900">{priceModalProduct?.name}</div>
            <div className="text-slate-600">
              Current Cost: LKR {priceModalProduct?.costPrice.toLocaleString()} | Current Selling: LKR {priceModalProduct?.sellingPrice.toLocaleString()}
            </div>
          </div>

          <Input
            label="New Cost Price (LKR)"
            type="number"
            min="0"
            value={newCostPrice}
            onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
            required
          />

          <Input
            label="New Selling Price (LKR)"
            type="number"
            min="0"
            value={newSellingPrice}
            onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
            required
          />

          <Input
            label="Reason for Price Adjustment *"
            placeholder="e.g. Cost inflation adjustment"
            value={priceReason}
            onChange={(e) => setPriceReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setPriceModalProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPrice} leftIcon={<Send className="w-3.5 h-3.5" />}>
              Submit Price Request & Notify Admin
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation for Stock Addition Request */}
      <ConfirmDialog
        isOpen={confirmingStockSubmit}
        onClose={() => setConfirmingStockSubmit(false)}
        onConfirm={() => {
          setConfirmingStockSubmit(false);
          const fakeEvent = { preventDefault: () => {} } as any;
          handleRequestStockAddition(fakeEvent);
        }}
        title="Submit Stock Addition Request"
        message={`Are you sure you want to submit a stock addition request (+${addQty} units) for product "${stockModalProduct?.name}" to Admin for approval?`}
        confirmText="Submit Request"
      />

      {/* Confirmation for Price Change Request */}
      <ConfirmDialog
        isOpen={confirmingPriceSubmit}
        onClose={() => setConfirmingPriceSubmit(false)}
        onConfirm={() => {
          setConfirmingPriceSubmit(false);
          const fakeEvent = { preventDefault: () => {} } as any;
          handleRequestPriceChange(fakeEvent);
        }}
        title="Submit Price Change Request"
        message={`Are you sure you want to submit price adjustment proposals for product "${priceModalProduct?.name}" and send an email alert to the Administrator?`}
        confirmText="Submit & Notify Admin"
      />

      {/* Multi-Product Bulk Stock Addition Modal (Requirement 1) */}
      <Dialog
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Add Stock Request"
        description="Enter incoming shipment quantities and acquisition costs across team products. Admin will approve all items in a single action."
        maxWidth="3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingBulkSubmit(true);
          }}
          className="space-y-4"
        >
          {/* Top Live Stats Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500">Items to Replenish:</span>{' '}
                <strong className="text-slate-900 font-mono">
                  {Object.values(bulkQuantities).filter((q) => q > 0).length} of {products.length}
                </strong>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-500">Total Units:</span>{' '}
                <strong className="text-emerald-700 font-mono text-sm">
                  +{Object.values(bulkQuantities).reduce((sum, q) => sum + (q || 0), 0)} units
                </strong>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              Leave quantity empty or 0 to skip products.
            </div>
          </div>

          {/* Desktop Table View (md: and up) */}
          <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-[35%]">Product</th>
                  <th className="py-3 px-3 w-[20%]">Add Qty (+)</th>
                  <th className="py-3 px-3 w-[22%]">Batch Cost (LKR)</th>
                  <th className="py-3 px-3 w-[23%]">Proposed Price (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const qty = bulkQuantities[p.id] || 0;
                  const cost = bulkBatchCosts[p.id] ?? p.costPrice;
                  const price = bulkProposedPrices[p.id] ?? p.sellingPrice;
                  const isAdding = qty > 0;

                  return (
                    <tr key={p.id} className={`transition-colors ${isAdding ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}`}>
                      {/* Product Name & On-Hand Badge */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">{p.code}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {p.currentStock} in stock
                          </span>
                          {isAdding && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                              → {p.currentStock + qty} projected
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Add Qty Input */}
                      <td className="py-3 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setBulkQuantities((prev) => ({ ...prev, [p.id]: val }));
                            }}
                            placeholder="0"
                            className="w-full text-xs font-bold font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </td>

                      {/* Batch Unit Cost */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBulkBatchCosts((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </td>

                      {/* Proposed Selling Price */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBulkProposedPrices((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden space-y-3">
            {products.map((p) => {
              const qty = bulkQuantities[p.id] || 0;
              const cost = bulkBatchCosts[p.id] ?? p.costPrice;
              const price = bulkProposedPrices[p.id] ?? p.sellingPrice;
              const isAdding = qty > 0;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                    isAdding ? 'border-blue-300 bg-blue-50/40 shadow-xs' : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.code}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                        {p.currentStock} in stock
                      </span>
                      {isAdding && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                          → {p.currentStock + qty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Add Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={qty === 0 ? '' : qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setBulkQuantities((prev) => ({ ...prev, [p.id]: val }));
                        }}
                        placeholder="0"
                        className="w-full text-xs font-bold font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Cost (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBulkBatchCosts((prev) => ({ ...prev, [p.id]: val }));
                        }}
                        className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Price (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBulkProposedPrices((prev) => ({ ...prev, [p.id]: val }));
                        }}
                        className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Input
            label="Reason / Remarks for Bulk Addition *"
            placeholder="e.g. Monthly stock inventory replenishment with updated vendor shipment invoices"
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingBulk} leftIcon={<Send className="w-3.5 h-3.5" />}>
              Submit 1 Approval Request for All Products
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation for Bulk Stock Request */}
      <ConfirmDialog
        isOpen={confirmingBulkSubmit}
        onClose={() => setConfirmingBulkSubmit(false)}
        onConfirm={() => {
          setConfirmingBulkSubmit(false);
          const fakeEvent = { preventDefault: () => {} } as any;
          handleRequestBulkStockAddition(fakeEvent);
        }}
        title="Submit Multi-Product Bulk Stock Request"
        message="Are you sure you want to submit a single multi-product stock addition request to Admin for 1-click approval?"
        confirmText="Submit Bulk Request"
      />

      {/* Report Damaged Stock Modal */}
      <Dialog
        isOpen={!!damageModalProduct}
        onClose={() => setDamageModalProduct(null)}
        title="Report Damaged Stock Units"
        description="Segregate damaged or broken units from sellable inventory. Damaged items are tracked separately."
        maxWidth="md"
      >
        {damageModalProduct && (
          <form onSubmit={handleReportDamage} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-rose-900">{damageModalProduct.name} ({damageModalProduct.code})</div>
              <div className="text-rose-800">
                Available Sellable Stock: <strong>{damageModalProduct.currentStock} units</strong>
                {damageModalProduct.damagedStock ? ` | Existing Damaged: ${damageModalProduct.damagedStock} units` : ''}
              </div>
            </div>

            <Input
              label="Damaged Quantity to Quarantine *"
              type="number"
              min="1"
              max={damageModalProduct.currentStock}
              value={damageQty}
              onChange={(e) => setDamageQty(parseInt(e.target.value) || 1)}
              required
            />

            <Input
              label="Damage Reason / Inspection Notes *"
              placeholder="e.g. Broken packaging / expired seal / transport damage"
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setDamageModalProduct(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" isLoading={isSubmittingDamage} leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}>
                Quarantine Damaged Stock
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Damaged Stock Audit Modal */}
      <Dialog
        isOpen={!!inspectingDamageProduct}
        onClose={() => setInspectingDamageProduct(null)}
        title={`Damaged Stock Audit — ${inspectingDamageProduct?.name || 'Product'}`}
        description="Quarantined inventory breakdown showing damaged order returns, customer roots, and courier causes."
        maxWidth="2xl"
      >
        {inspectingDamageProduct && (
          <div className="space-y-4">
            {/* Header KPI summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Damaged</div>
                <div className="mt-1 text-xl font-black text-rose-900 font-mono">
                  {inspectingDamageProduct.damagedStock || 0} <span className="text-xs font-normal">units</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sellable On-Hand</div>
                <div className="mt-1 text-xl font-black text-slate-900 font-mono">
                  {inspectingDamageProduct.currentStock}{' '}
                  <span className="text-xs font-normal text-slate-500">units</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Quarantine Loss (Est.)</div>
                <div className="mt-1 text-lg font-black text-amber-900 font-mono">
                  LKR {((inspectingDamageProduct.damagedStock || 0) * inspectingDamageProduct.costPrice).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Damaged Order Return Audit Trail</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {damageAuditRecords.length} record{damageAuditRecords.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {loadingDamageAudit ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit records...</div>
              ) : damageAuditRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl italic">
                  No order-level return records found. Damaged stock was adjusted via direct stock quarantine.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Reference / Order</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Return Date</th>
                        <th className="py-2.5 px-3 text-center">Damaged Qty</th>
                        <th className="py-2.5 px-3">Root Cause / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {damageAuditRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            {record.orderNumber ? (
                              <div>
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                                  {record.orderNumber}
                                </span>
                                {record.orderStatus && (
                                  <div className="text-[10px] text-rose-700 font-sans mt-0.5">
                                    Status: {record.orderStatus}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Stock Adjustment</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {record.customerName ? (
                              <div>
                                <div className="font-semibold text-slate-900">{record.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{record.customerCity}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {new Date(record.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-mono text-xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {record.quantity} units
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-700 text-xs max-w-xs">
                            <p className="line-clamp-2" title={record.reason}>
                              {record.reason}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setInspectingDamageProduct(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
