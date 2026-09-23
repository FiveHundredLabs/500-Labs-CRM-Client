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
  Sparkles,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Calculator,
  UserCheck,
  Calendar,
  Wallet,
} from 'lucide-react';

export const SupervisorCashOnHandPage: React.FC = () => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CashOnHandSearchResult | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(350);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label} to clipboard!`, { duration: 1500 });
    setTimeout(() => setCopiedText(null), 2000);
  };

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

  // Quick stats derived from handovers
  const approvedTotal = handovers
    .filter((h) => h.status === 'APPROVED')
    .reduce((sum, h) => sum + Number(h.amountCollected || 0), 0);

  const pendingHandoverCount = handovers.filter((h) => h.status === 'PENDING').length;
  const pendingHandoverAmount = handovers
    .filter((h) => h.status === 'PENDING')
    .reduce((sum, h) => sum + Number(h.amountCollected || 0), 0);

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
      const msg = err.response?.data?.message || err.message || 'Failed to process delivery';
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
      const msg = err.response?.data?.message || err.message || 'Failed to process rejection';
      toast.error(msg);
    } finally {
      setIsProcessingReject(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 px-1">
      {/* Minimal Clean Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Cash on Hand Collection
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Counter POS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct counter cash collections for pickup orders. Queued for Admin handover verification.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges - Compact */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Pending Handover
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-900">{pendingHandoverCount} Orders</span>
                <span className="text-[11px] font-semibold text-amber-700">({formatCurrency(pendingHandoverAmount)})</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Verified
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {formatCurrency(approvedTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Elevated Search Console */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardContent className="p-3.5">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-indigo-600" />
                Find Customer Order by Phone
              </label>
              <span className="text-[10px] text-slate-400">
                Instant lookup for Interested orders
              </span>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter phone number (e.g. 0701234567, 0771234567...)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-9 text-xs py-2 h-9 rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSearching || !phoneNumber.trim()}
                  className="px-4 py-2 h-9 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Find Order
                    </>
                  )}
                </Button>

                {phoneNumber && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="px-3 py-2 h-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Customer Found with Active Interested Order */}
      {searchResult && searchResult.found && activeOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fadeIn">
          {/* Left Column: Customer & Delivery Info (4 cols) */}
          <div className="space-y-4 lg:col-span-4">
            {/* Customer Details Card - Minimal & Compact */}
            <Card className="border-slate-200 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-2.5 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {searchResult.customer?.fullName?.slice(0, 2).toUpperCase() || 'CU'}
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-tight">
                        Customer Information
                      </CardTitle>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Verified Contact Profile
                      </span>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
              </CardHeader>

              <CardContent className="p-3.5 space-y-3 text-xs bg-white">
                {/* Name */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Name
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {searchResult.customer?.fullName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(searchResult.customer?.fullName || '', 'Name')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                      title="Copy Name"
                    >
                      {copiedText === 'Name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Phone Number
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800 text-xs">
                      <Phone className="w-3 h-3 text-indigo-600" />
                      <span>{searchResult.customer?.phone}</span>
                      {searchResult.customer?.phoneAlt && (
                        <span className="text-slate-400 font-normal text-[11px]">
                          / {searchResult.customer.phoneAlt}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(searchResult.customer?.phone || '', 'Phone')}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                    title="Copy Phone"
                  >
                    {copiedText === 'Phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Address */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Delivery / Residence Address
                  </span>
                  <div className="mt-1 p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-xs leading-relaxed font-medium">
                      {searchResult.customer?.address || 'No street address specified'}
                      {searchResult.customer?.city && (
                        <span className="block font-semibold text-slate-900 mt-0.5">
                          City: {searchResult.customer.city}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Handled By Specialist */}
                {searchResult.customer?.assignedMember && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned Specialist
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {searchResult.customer.assignedMember.fullName}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {searchResult.customer.assignedMember.phone}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Orders History Card - Compact */}
            {searchResult.pastOrders && searchResult.pastOrders.length > 0 && (
              <Card className="border-amber-200/70 bg-amber-50/30 shadow-2xs">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-amber-950">
                          Order History ({searchResult.pastOrders.length})
                        </p>
                        <span className="text-[10px] font-semibold text-amber-700">Previous orders</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        {searchResult.pastOrders.slice(0, 3).map((po) => (
                          <div
                            key={po.id}
                            className="flex justify-between items-center py-1 px-2 rounded bg-white/90 border border-amber-200/50"
                          >
                            <span className="font-bold text-slate-800">#{po.orderNumber}</span>
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

          {/* Right Column: Order Details & Compact POS Breakdown (8 cols) */}
          <div className="space-y-4 lg:col-span-8">
            <Card className="border-slate-200 shadow-2xs overflow-hidden bg-white">
              {/* Minimal Clean Order Header (No Black) */}
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-2.5 px-4 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold tracking-wider bg-white px-2.5 py-0.5 rounded border border-indigo-200 text-indigo-700">
                      #{activeOrder.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeOrder.orderNumber, 'Order Number')}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                      title="Copy Order #"
                    >
                      {copiedText === 'Order Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Created on {format(new Date(activeOrder.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    INTERESTED ({activeOrder.status})
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Items Breakdown Table - Compact */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      Included Package Items
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {(activeOrder.items && activeOrder.items.length) || 1} Item(s)
                    </span>
                  </div>

                  <div className="border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Item / Product Name</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrder.items && activeOrder.items.length > 0 ? (
                          activeOrder.items.map((it, idx) => (
                            <tr key={it.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                                    {idx + 1}
                                  </div>
                                  <span>{it.productName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600 font-medium">
                                {formatCurrency(Number(it.unitPrice))}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800 text-[11px]">
                                  {it.quantity}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900">
                                {formatCurrency(Number(it.subtotal))}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-slate-700 font-semibold">
                              {activeOrder.itemsDescription || 'Standard Package'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* POS Cash Calculation Box - Minimal & Clean */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Cash Collection Breakdown
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Package rate + counter delivery fee
                    </span>
                  </div>

                  {/* Product Value (Fixed) */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">Product Sales Value (Package Fixed):</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {formatCurrency(productSalesValue)}
                    </span>
                  </div>

                  {/* Delivery Charge (Editable with Presets) */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-indigo-600" />
                          Delivery / Collection Charge
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Set to 0 if picked up free at counter, or enter custom fee.
                        </p>
                      </div>

                      {/* Manual input */}
                      <div className="relative w-32 self-end sm:self-center">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-xs font-bold text-slate-400">
                          Rs.
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={deliveryCharge}
                          onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                          className="pl-8 pr-2 py-1 text-right font-bold text-slate-900 rounded-md text-xs border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-8"
                        />
                      </div>
                    </div>

                    {/* Quick rate toggle pills - NO BLACK */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Select:</span>
                      {[
                        { label: 'Free (Rs. 0)', value: 0 },
                        { label: 'Rs. 250', value: 250 },
                        { label: 'Rs. 350 (Std)', value: 350 },
                        { label: 'Rs. 450', value: 450 },
                      ].map((preset) => {
                        const isSelected = deliveryCharge === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setDeliveryCharge(preset.value)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total Cash to Collect - Minimal Light Cardlet (No Black) */}
                  <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                          Total Cash To Collect
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                        Product ({formatCurrency(productSalesValue)}) + Fee ({formatCurrency(deliveryCharge)})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight font-mono">
                        {formatCurrency(totalCashToCollect)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button - Only Delivered (Reject Button Removed) */}
                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={() => setIsDeliverDialogOpen(true)}
                    className="w-full py-2.5 h-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs text-sm rounded-xl transition-all duration-150 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Cash Collected - Mark as Delivered
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Customer Found, but NO Active Interested Order */}
      {searchResult && searchResult.found && !activeOrder && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-xs animate-fadeIn">
          <CardContent className="p-6">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-amber-950">
                    No Active Interested Order for {searchResult.customer?.fullName}
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Cash on Hand collection is only permitted for orders currently in the{' '}
                    <strong>Interested</strong> stage (`PREPARED` or `DRAFT`). This customer has no
                    active Interested order.
                  </p>
                </div>

                {searchResult.pastOrders && searchResult.pastOrders.length > 0 && (
                  <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Order #</th>
                          <th className="px-3.5 py-2.5">Status</th>
                          <th className="px-3.5 py-2.5">Delivery Method</th>
                          <th className="px-3.5 py-2.5">Amount</th>
                          <th className="px-3.5 py-2.5">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {searchResult.pastOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3.5 py-2.5 font-bold text-slate-800">
                              #{o.orderNumber}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <StatusBadge type="order" status={o.status} className="text-[10px]" />
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600">
                              {o.deliveryMethod || 'POST'}
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                              {formatCurrency(Number(o.totalAmount))}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500">
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
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 py-4 px-6 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Banknote className="w-5 h-5" />
            </div>
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
            className="flex items-center gap-1.5 text-xs cursor-pointer border-slate-200 hover:bg-slate-100 rounded-lg px-3 py-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHandovers ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No Cash on Hand submissions yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {loadingHandovers
                          ? 'Loading handover audit trail...'
                          : 'Orders collected via Cash on Hand will be recorded here for physical handover to Admin.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">
                        {format(new Date(h.createdAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-700 whitespace-nowrap font-mono">
                        #{h.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">
                          {h.customerName}
                        </span>
                        <span className="text-slate-400 text-[11px]">{h.customerPhone}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{h.supervisorName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
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
                      <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                        {formatCurrency(Number(h.amountCollected))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {h.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved &amp; Received
                          </span>
                        ) : h.status === 'DECLINED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Declined (Reverted)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
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
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-semibold">Order Number:</span>
              <span className="font-mono font-bold text-slate-900">#{activeOrder?.orderNumber}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-semibold">Customer:</span>
              <span className="font-bold text-slate-900">
                {searchResult?.customer?.fullName} ({searchResult?.customer?.phone})
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-semibold">Product Package Value:</span>
              <span className="font-bold text-slate-900">{formatCurrency(productSalesValue)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-semibold">Agreed Collection Fee:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(Number(deliveryCharge || 0))}
              </span>
            </div>
            <div className="pt-2.5 border-t border-emerald-200/80 flex justify-between items-center">
              <span className="text-sm font-extrabold text-emerald-950">Total Cash Collected:</span>
              <span className="text-2xl font-black text-emerald-950 font-sans">
                {formatCurrency(totalCashToCollect)}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Important Notice regarding Admin Handover:</p>
              <p className="mt-0.5 leading-relaxed">
                The physical cash of <strong>{formatCurrency(totalCashToCollect)}</strong> must be
                physically handed over to the Admin. An approval request will be submitted to the Admin
                portal. If the Admin declines receipt, the order will revert to the Interested stage.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessingDelivery}
              onClick={() => setIsDeliverDialogOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingDelivery}
              onClick={handleConfirmDeliver}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 rounded-lg cursor-pointer"
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
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                className="pl-9 pr-2 py-1.5 text-right text-xs font-bold rounded-lg"
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
                      className="w-24 text-right py-1 h-auto rounded-lg"
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
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingReject || !rejectionReason.trim()}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 rounded-lg shadow-sm"
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
