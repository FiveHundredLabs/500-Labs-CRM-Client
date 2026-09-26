import apiClient from '../lib/apiClient';
import type {
  OrderReplacementRequest,
  CreateOrderReplacementPayload,
  ReviewOrderReplacementPayload,
  ConfirmDamagedReturnPayload,
  ApprovalStatus,
  ReplacementReturnStatus,
} from '../models/domain';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export class ApiReplacementRepository {
  async getAll(
    status?: ApprovalStatus | 'ALL',
    teamId?: string,
    returnStatus?: ReplacementReturnStatus | 'ALL',
  ): Promise<OrderReplacementRequest[]> {
    const params = new URLSearchParams();
    if (status && (status as string) !== 'ALL') params.append('status', status);
    if (teamId) params.append('teamId', teamId);
    if (returnStatus && (returnStatus as string) !== 'ALL') params.append('returnStatus', returnStatus);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return unwrap(
      await apiClient.get<{ data: OrderReplacementRequest[] }>(`/orders/replacement-requests${queryString}`),
    );
  }

  async getById(id: string): Promise<OrderReplacementRequest | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: OrderReplacementRequest }>(`/orders/replacement-requests/${id}`),
      );
    } catch {
      return null;
    }
  }

  async getByOrderId(orderId: string): Promise<OrderReplacementRequest[]> {
    try {
      return unwrap(
        await apiClient.get<{ data: OrderReplacementRequest[] }>(`/orders/${orderId}/replacement-request`),
      );
    } catch {
      return [];
    }
  }

  async create(
    orderId: string,
    payload: CreateOrderReplacementPayload,
  ): Promise<OrderReplacementRequest> {
    return unwrap(
      await apiClient.post<{ data: OrderReplacementRequest }>(
        `/orders/${orderId}/replacement-request`,
        payload,
      ),
    );
  }

  async review(
    id: string,
    payload: ReviewOrderReplacementPayload,
  ): Promise<OrderReplacementRequest> {
    return unwrap(
      await apiClient.patch<{ data: OrderReplacementRequest }>(
        `/orders/replacement-requests/${id}/review`,
        payload,
      ),
    );
  }

  async confirmReturn(
    id: string,
    payload: ConfirmDamagedReturnPayload,
  ): Promise<OrderReplacementRequest> {
    return unwrap(
      await apiClient.patch<{ data: OrderReplacementRequest }>(
        `/orders/replacement-requests/${id}/confirm-return`,
        payload,
      ),
    );
  }
}

export const replacementRepository = new ApiReplacementRepository();
