import apiClient from '../lib/apiClient';
import type {
  CashOnHandHandover,
  CashOnHandStatus,
  ProcessCashOnHandPayload,
  ReviewCashOnHandPayload,
  Order,
  Customer,
} from '../models/domain';

export interface CashOnHandSearchResult {
  found: boolean;
  message?: string;
  customer: Customer | null;
  activeInterestedOrder: (Order & {
    productSalesValue: number;
    deliveryCharge: number;
    totalCashToCollect: number;
  }) | null;
  pastOrders: Order[];
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export class ApiCashOnHandRepository {
  async searchByPhone(phone: string): Promise<CashOnHandSearchResult> {
    const params = new URLSearchParams({ phone });
    return unwrap(
      await apiClient.get<{ data: CashOnHandSearchResult }>(
        `/orders/cash-on-hand/search?${params.toString()}`,
      ),
    );
  }

  async processCashOnHand(
    orderId: string,
    payload: ProcessCashOnHandPayload,
  ): Promise<{
    success: boolean;
    order: Order;
    handover: CashOnHandHandover;
    amountCollected: number;
  }> {
    return unwrap(
      await apiClient.post<{
        data: {
          success: boolean;
          order: Order;
          handover: CashOnHandHandover;
          amountCollected: number;
        };
      }>(`/orders/${orderId}/cash-on-hand`, payload),
    );
  }

  async getAllHandovers(
    status?: CashOnHandStatus,
    teamId?: string,
  ): Promise<CashOnHandHandover[]> {
    const params = new URLSearchParams();
    if (status && (status as string) !== 'ALL') params.append('status', status);
    if (teamId) params.append('teamId', teamId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return unwrap(
      await apiClient.get<{ data: CashOnHandHandover[] }>(
        `/orders/cash-on-hand/handovers${queryString}`,
      ),
    );
  }

  async getHandoverById(id: string): Promise<CashOnHandHandover | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: CashOnHandHandover }>(
          `/orders/cash-on-hand/handovers/${id}`,
        ),
      );
    } catch {
      return null;
    }
  }

  async reviewHandover(
    id: string,
    payload: ReviewCashOnHandPayload,
  ): Promise<any> {
    return unwrap(
      await apiClient.patch<{ data: any }>(
        `/orders/cash-on-hand/handovers/${id}/review`,
        payload,
      ),
    );
  }
}

export const cashOnHandRepository = new ApiCashOnHandRepository();
