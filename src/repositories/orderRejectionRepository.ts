import apiClient from '../lib/apiClient';
import type {
  OrderRejectionRequest,
  CreateOrderRejectionPayload,
  ReviewOrderRejectionPayload,
  ApprovalStatus,
} from '../models/domain';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export class ApiOrderRejectionRepository {
  async getAll(status?: ApprovalStatus, teamId?: string): Promise<OrderRejectionRequest[]> {
    const params = new URLSearchParams();
    if (status && (status as string) !== 'ALL') params.append('status', status);
    if (teamId) params.append('teamId', teamId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return unwrap(
      await apiClient.get<{ data: OrderRejectionRequest[] }>(`/orders/rejection-requests${queryString}`),
    );
  }

  async getById(id: string): Promise<OrderRejectionRequest | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: OrderRejectionRequest }>(`/orders/rejection-requests/${id}`),
      );
    } catch {
      return null;
    }
  }

  async getByOrderId(orderId: string): Promise<OrderRejectionRequest | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: OrderRejectionRequest }>(`/orders/${orderId}/rejection-request`),
      );
    } catch {
      return null;
    }
  }

  async create(orderId: string, payload: CreateOrderRejectionPayload): Promise<OrderRejectionRequest> {
    return unwrap(
      await apiClient.post<{ data: OrderRejectionRequest }>(
        `/orders/${orderId}/rejection-request`,
        payload,
      ),
    );
  }

  async review(id: string, payload: ReviewOrderRejectionPayload): Promise<OrderRejectionRequest> {
    return unwrap(
      await apiClient.patch<{ data: OrderRejectionRequest }>(
        `/orders/rejection-requests/${id}/review`,
        payload,
      ),
    );
  }
}

export const orderRejectionRepository = new ApiOrderRejectionRepository();
