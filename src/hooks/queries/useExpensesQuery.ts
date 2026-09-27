import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRepository } from '../../repositories';
import { queryKeys, CACHE_TIERS } from '../../lib/queryClient';
import type { ExpensePaginationParams, ExpenseWritePayload, ExpenseUpdatePayload } from '../../repositories/interfaces';
import toast from 'react-hot-toast';

export function useExpenseSummaryQuery(params?: ExpensePaginationParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(params),
    queryFn: () => expenseRepository.getSummary(params),
    enabled,
    staleTime: CACHE_TIERS.WARM,
  });
}

export function usePaginatedExpensesQuery(params: ExpensePaginationParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.expenses.paginated(params),
    queryFn: () => expenseRepository.getPaginated(params),
    enabled,
    staleTime: CACHE_TIERS.WARM,
  });
}

export function useExpenseCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.expenses.categories,
    queryFn: () => expenseRepository.getCategories(),
    enabled,
    staleTime: CACHE_TIERS.COLD,
  });
}

export function useExpenseMutations() {
  const queryClient = useQueryClient();

  const createExpenseMutation = useMutation({
    mutationFn: (payload: ExpenseWritePayload) => expenseRepository.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.dashboard() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to record expense.');
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ExpenseUpdatePayload }) =>
      expenseRepository.update(id, updates),
    onSuccess: () => {
      toast.success('Expense voucher updated successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.dashboard() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update expense.');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseRepository.delete(id),
    onSuccess: () => {
      toast.success('Expense record deleted successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.dashboard() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete expense.');
    },
  });

  return {
    createExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation,
  };
}
