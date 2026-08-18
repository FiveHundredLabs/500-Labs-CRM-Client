import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Product, StockActivityLog, ApprovalRequest, User } from '../../models/domain';
import { productRepository, stockActivityLogRepository, approvalRequestRepository, emailNotificationRepository, userRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Package, PlusCircle, DollarSign, AlertTriangle, Clock, CheckCircle2, XCircle, History, Send } from 'lucide-react';
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
  const [stockReason, setStockReason] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Request Price Change Modal
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState<string>('');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  const loadData = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      // Requirement 2.9: Only load products belonging to supervisor's team!
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

  // Requirement 2.10: Supervisor requests stock addition (Creates pending ApprovalRequest)
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
        oldValue: stockModalProduct.currentStock,
        newValue: stockModalProduct.currentStock + addQty,
        quantity: addQty,
        reason: stockReason || `Supervisor stock addition request for +${addQty} units`,
      });

      toast.success(`Submitted stock addition request (+${addQty} units) for Admin approval.`);
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

  if (loading) return <LoadingState rows={6} />;

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockThreshold).length;
  const pendingRequestsCount = approvalRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Inventory Management"
        description="Monitor team-specific product stock, request inventory additions, and request price adjustments"
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

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Min Threshold</th>
                <th className="py-3 px-3">Cost Price</th>
                <th className="py-3 px-3">Selling Price</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                    No products found for your team.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
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
                      <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                        {product.currentStock}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {product.minStockThreshold}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        LKR {product.costPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                        LKR {product.sellingPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<PlusCircle className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => {
                              setStockModalProduct(product);
                              setAddQty(50);
                              setStockReason('');
                            }}
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
        title="Request Stock Addition"
        description="Submit stock quantity request for Admin approval"
      >
        <form onSubmit={handleRequestStockAddition} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-blue-900">{stockModalProduct?.name}</div>
            <div className="text-blue-700">
              Current Stock: <strong>{stockModalProduct?.currentStock}</strong> | Min Threshold: <strong>{stockModalProduct?.minStockThreshold}</strong>
            </div>
          </div>

          <Input
            label="Additional Quantity (+)"
            type="number"
            min="1"
            value={addQty}
            onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
            required
          />

          <Input
            label="Reason / Remarks *"
            placeholder="e.g. Replenishing stock for promo campaign"
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
        <form onSubmit={handleRequestPriceChange} className="space-y-4">
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
    </div>
  );
};
