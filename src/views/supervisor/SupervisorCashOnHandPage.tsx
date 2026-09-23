import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatCurrency } from '../../utils/currency';
import { cashOnHandRepository, CashOnHandSearchResult } from '../../repositories/cashOnHandRepository';
import type { CashOnHandHandover, Order, OrderRejectionDamagedItem } from '../../models/domain';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Package,
  Lock,
  Clock,
  RefreshCw,
  Info,
  DollarSign,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const SupervisorCashOnHandPage: React.FC = () => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CashOnHandSearchResult | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(350);

  // Delivery Confirm Dialog
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false);

  // Reject Dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isProcessingReject, setIsProcessingReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDeliveryCharge, setRejectDeliveryCharge] = useState<number>(0);
  const [hasDamagedItems, setHasDamagedItems] = useState(false);
  const [damagedItemsList, setDamagedItemsList] = useState<
    Array<{ productId?: string; productName: string; quantity: number; reason?: string }>
  >([]);

  // Recent Handovers
  const [handovers, setHandovers] = useState<CashOnHandHandover[]>([]);
  const [loadingHandovers, setLoadingHandovers] = useState(false);

  const fetchHandovers = async () => {
    setLoadingHandovers(true);
    try {
      const data = await cashOnHandRepository.getAllHandovers();
      setHandovers(data);
    } catch (err: any) {
      console.error('Failed to load handovers', err);
    } finally {
      setLoadingHandovers(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = phoneNumber.trim();
    if (!query) {
      toast.error('Please enter a phone number to search.');
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    try {
      const result = await cashOnHandRepository.searchByPhone(query);
      setSearchResult(result);
      if (result.activeInterestedOrder) {
        setDeliveryCharge(result.activeInterestedOrder.deliveryCharge ?? 350);
        // Prepare initial damaged items list if any
        if (result.activeInterestedOrder.items) {
          setDamagedItemsList(
            result.activeInterestedOrder.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              reason: '',
            })),
          );
        }
      } else if (!result.found) {
        toast.error(`No customer record found matching "${query}"`);
      } else {
        toast('Customer found, but has no active Interested order.', {
          icon: 'ℹ️',
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Search failed';
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setSearchResult(null);
  };

  const activeOrder = searchResult?.activeInterestedOrder;
  const productSalesValue = activeOrder?.productSalesValue ?? 0;
  const totalCashToCollect = Math.max(0, productSalesValue + Number(deliveryCharge || 0));

  const handleConfirmDeliver = async () => {
    if (!activeOrder) return;
    setIsProcessingDelivery(true);
    try {
      const response = await cashOnHandRepository.processCashOnHand(activeOrder.id, {
        outcomeStatus: 'DELIVERED',
        deliveryCharge: Number(deliveryCharge || 0),
      });

      toast.success(
        `Order #${response.order.orderNumber} marked Delivered! Cash handover request submitted to Admin.`,
        { duration: 5000 },
      );
      setIsDeliverDialogOpen(false);
      // Refresh state
      setSearchResult(null);
      setPhoneNumber('');
      fetchHandovers();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to process delivery';
      toast.error(msg);
    } finally {
      setIsProcessingDelivery(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeOrder) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    const filteredDamagedItems = hasDamagedItems
      ? damagedItemsList.filter((d) => d.quantity > 0)
      : [];

    setIsProcessingReject(true);
    try {
      const response = await cashOnHandRepository.processCashOnHand(activeOrder.id, {
        outcomeStatus: 'REJECTED',
        deliveryCharge: Number(rejectDeliveryCharge || 0),
        rejectionReason: rejectionReason.trim(),
        damagedItems: filteredDamagedItems.length > 0 ? (filteredDamagedItems as any) : undefined,
      });

      toast.success(
        `Order #${response.order.orderNumber} marked as Rejected. Cash handover request submitted to Admin.`,
        { duration: 5000 },
      );
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setRejectDeliveryCharge(0);
      setHasDamagedItems(false);
      // Refresh state
      setSearchResult(null);
      setPhoneNumber('');
      fetchHandovers();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to process rejection';
      toast.error(msg);
    } finally {
      setIsProcessingReject(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Cash on Hand Collection"
        subtitle="Collect direct cash payments from customers for Interested stage orders without courier dispatch. Collected cash requires physical handover verification by Admin."
      />

      {/* Search Bar Card */}
      <Card className="border-indigo-100 shadow-xs">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Enter customer phone number (e.g. 0771234567 or +9477...)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10 text-base py-2.5 h-auto"
                autoFocus
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={isSearching || !phoneNumber.trim()}
                className="flex-1 sm:flex-initial items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer px-6 py-2.5 h-auto"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find Order
                  </>
                )}
              </Button>
              {phoneNumber && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="px-4 py-2.5 h-auto cursor-pointer"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Customer Found with Active Interested Order */}
      {searchResult && searchResult.found && activeOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer & Team Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Customer Details */}
            <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Customer Name</span>
                  <span className="font-bold text-slate-900 text-base">
                    {searchResult.customer?.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Phone Number</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {searchResult.customer?.phone}
                    {searchResult.customer?.phoneAlt && (
                      <span className="text-slate-400 font-normal">
                        / {searchResult.customer.phoneAlt}
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Delivery Address</span>
                  <span className="text-slate-700 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {searchResult.customer?.address || 'No street address provided'}
                      {searchResult.customer?.city && `, ${searchResult.customer.city}`}
                      {searchResult.customer?.postalCode && ` (${searchResult.customer.postalCode})`}
                    </span>
                  </span>
                </div>
                {searchResult.customer?.assignedMember && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium block">
                      Handled By Specialist
                    </span>
                    <span className="font-medium text-slate-800">
                      {searchResult.customer.assignedMember.fullName} (
                      {searchResult.customer.assignedMember.phone})
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Orders Alert if any */}
            {searchResult.pastOrders && searchResult.pastOrders.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        {searchResult.pastOrders.length} Previous Order(s) on Record
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-amber-800">
                        {searchResult.pastOrders.slice(0, 3).map((po) => (
                          <div key={po.id} className="flex justify-between items-center py-0.5">
                            <span className="font-medium">#{po.orderNumber}</span>
                            <StatusBadge type="order" status={po.status} className="text-[10px]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Order Details & Cash Calculation */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-indigo-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border-b border-indigo-100 py-3.5 px-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-indigo-950 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    Interested Order #{activeOrder.orderNumber}
                  </CardTitle>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Order created {format(new Date(activeOrder.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    STAGE: INTERESTED ({activeOrder.status})
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Items Breakdown Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Package Items
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2">Item / Product</th>
                          <th className="px-3.5 py-2 text-right">Unit Price</th>
                          <th className="px-3.5 py-2 text-center">Qty</th>
                          <th className="px-3.5 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrder.items && activeOrder.items.length > 0 ? (
                          activeOrder.items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td className="px-3.5 py-2 font-medium text-slate-800">
                                {it.productName}
                              </td>
                              <td className="px-3.5 py-2 text-right text-slate-600">
                                {formatCurrency(Number(it.unitPrice))}
                              </td>
                              <td className="px-3.5 py-2 text-center font-bold text-slate-700">
                                {it.quantity}
                              </td>
                              <td className="px-3.5 py-2 text-right font-semibold text-slate-900">
                                {formatCurrency(Number(it.subtotal))}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-3.5 py-2.5 text-slate-700 font-medium">
                              {activeOrder.itemsDescription || 'Standard Package'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Calculation Box */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cash on Hand Collection Calculation
                  </h4>

                  {/* Product Value (Fixed) */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Product Sales Value (Package Fixed):</span>
                    </div>
                    <span className="font-bold text-slate-900 text-base">
                      {formatCurrency(productSalesValue)}
                    </span>
                  </div>

                  {/* Delivery Charge (Editable) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-indigo-600" />
                        Delivery Charge (Adjustable):
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Can be set to 0 for free delivery or custom agreed rate.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-36">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400">
                          Rs.
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={deliveryCharge}
                          onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                          className="pl-9 pr-2 py-1.5 text-right font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Charge Presets */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium">Quick rates:</span>
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(0)}
                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        deliveryCharge === 0
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Free (Rs. 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(250)}
                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        deliveryCharge === 250
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Rs. 250
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(350)}
                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        deliveryCharge === 350
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Rs. 350 (Std)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(450)}
                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        deliveryCharge === 450
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Rs. 450
                    </button>
                  </div>

                  {/* Total Cash to Collect (Prominent Box) */}
                  <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                        Total Cash to Collect
                      </span>
                      <span className="text-xs text-emerald-700">
                        Product ({formatCurrency(productSalesValue)}) + Delivery Fee (
                        {formatCurrency(deliveryCharge)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                        {formatCurrency(totalCashToCollect)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsDeliverDialogOpen(true)}
                    className="flex-1 py-3 h-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Cash Collected - Mark as Delivered
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRejectDialogOpen(true)}
                    className="py-3 h-auto border-rose-300 text-rose-700 hover:bg-rose-50 font-bold flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <XCircle className="w-5 h-5 text-rose-600" />
                    Customer Refused - Mark as Rejected
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Customer Found, but NO Active Interested Order */}
      {searchResult && searchResult.found && !activeOrder && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-amber-950">
                    No Active Interested Order for {searchResult.customer?.fullName}
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    Cash on Hand collection is only permitted for orders currently in the{' '}
                    <strong>Interested</strong> stage (`PREPARED` or `DRAFT`). This customer has no
                    active Interested order.
                  </p>
                </div>

                {searchResult.pastOrders && searchResult.pastOrders.length > 0 && (
                  <div className="border border-amber-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Order #</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Delivery Method</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {searchResult.pastOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-bold text-slate-800">
                              #{o.orderNumber}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge type="order" status={o.status} className="text-[10px]" />
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {o.deliveryMethod || 'POST'}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-900">
                              {formatCurrency(Number(o.totalAmount))}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {format(new Date(o.createdAt), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Cash on Hand Handovers Table */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 py-4 px-6">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Recent Cash on Hand Submissions &amp; Verification Status
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of orders marked as Cash on Hand awaiting or verified by Admin.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchHandovers}
            disabled={loadingHandovers}
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHandovers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 text-right">Cash Collected</th>
                  <th className="px-4 py-3">Admin Verification</th>
                  <th className="px-4 py-3">Admin Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      {loadingHandovers
                        ? 'Loading handover audit trail...'
                        : 'No Cash on Hand submissions found yet.'}
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {format(new Date(h.createdAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-700 whitespace-nowrap">
                        #{h.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">
                          {h.customerName}
                        </span>
                        <span className="text-slate-400 text-[11px]">{h.customerPhone}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{h.supervisorName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            h.outcomeStatus === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {h.outcomeStatus === 'DELIVERED' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {h.outcomeStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(Number(h.amountCollected))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {h.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved / Received
                          </span>
                        ) : h.status === 'DECLINED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Declined (Reverted)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Awaiting Admin Receipt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">
                        {h.adminNotes || (
                          <span className="text-slate-300 italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Deliver Confirmation Dialog */}
      <Dialog
        isOpen={isDeliverDialogOpen}
        onClose={() => !isProcessingDelivery && setIsDeliverDialogOpen(false)}
        title="Confirm Cash on Hand Delivery"
      >
        <div className="space-y-4 pt-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Order Number:</span>
              <span className="font-bold text-slate-900">#{activeOrder?.orderNumber}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Customer:</span>
              <span className="font-bold text-slate-900">
                {searchResult?.customer?.fullName} ({searchResult?.customer?.phone})
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Product Package Value:</span>
              <span className="font-bold text-slate-900">{formatCurrency(productSalesValue)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Agreed Delivery Fee:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(Number(deliveryCharge || 0))}
              </span>
            </div>
            <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-950">Total Cash Collected:</span>
              <span className="text-xl font-black text-emerald-950">
                {formatCurrency(totalCashToCollect)}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Important Notice regarding Admin Verification:</p>
              <p className="mt-0.5">
                The physical cash of <strong>{formatCurrency(totalCashToCollect)}</strong> must be
                handed over to the Admin. An approval request will be submitted to the Admin
                portal. If the Admin declines, the order will automatically revert to the
                Interested stage.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessingDelivery}
              onClick={() => setIsDeliverDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingDelivery}
              onClick={handleConfirmDeliver}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
            >
              {isProcessingDelivery ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Cash Collected &amp; Deliver
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        isOpen={isRejectDialogOpen}
        onClose={() => !isProcessingReject && setIsRejectDialogOpen(false)}
        title="Mark Cash on Hand Order as Rejected"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Rejection Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Customer refused package at door, customer wanted different item, etc."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Delivery Fee Collected (if any)
            </label>
            <div className="relative w-40">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400">
                Rs.
              </span>
              <Input
                type="number"
                min="0"
                value={rejectDeliveryCharge}
                onChange={(e) => setRejectDeliveryCharge(Math.max(0, Number(e.target.value)))}
                className="pl-9 pr-2 py-1 text-right text-xs font-bold"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Enter 0 if the customer did not pay any delivery or return charge.
            </p>
          </div>

          {/* Damaged items check */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDamagedItems}
                onChange={(e) => setHasDamagedItems(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Customer returned package with damaged goods
              </span>
            </label>

            {hasDamagedItems && (
              <div className="space-y-2 pl-4 border-l-2 border-rose-200">
                {damagedItemsList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 font-medium text-slate-700 truncate">
                      {item.productName}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Damaged Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setDamagedItemsList((prev) =>
                          prev.map((d, i) => (i === idx ? { ...d, quantity: val } : d)),
                        );
                      }}
                      className="w-24 text-right py-1 h-auto"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessingReject}
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingReject || !rejectionReason.trim()}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
            >
              {isProcessingReject ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
