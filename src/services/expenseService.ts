import { expenseRepository } from '../repositories';
import { Expense, ExpenseCategory, User } from '../models/domain';
import { ActivityLogService } from './activityLogService';

export interface CreateExpenseInput {
  categoryId: string;
  categoryName: string;
  customCategoryName?: string;
  amount: number;
  expenseDate: string;
  remarks: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH';
  notes?: string;
  pettyCashRef?: string;
}

export class ExpenseService {
  static async getAllExpenses(): Promise<Expense[]> {
    return expenseRepository.getAll();
  }

  static async getCategories(): Promise<ExpenseCategory[]> {
    return expenseRepository.getCategories();
  }

  static async createExpense(input: CreateExpenseInput, actor: User): Promise<Expense> {
    let finalCategoryName = input.categoryName;
    let finalCategoryId = input.categoryId;

    if (input.categoryName === 'Other' && input.customCategoryName && input.customCategoryName.trim() !== '') {
      finalCategoryName = input.customCategoryName.trim();
      const createdCategory = await expenseRepository.createCategory({
        name: finalCategoryName,
        isCustom: true,
      });
      finalCategoryId = createdCategory.id;
    }

    const newExpense = await expenseRepository.create({
      categoryId: finalCategoryId,
      categoryName: finalCategoryName,
      amount: input.amount,
      expenseDate: input.expenseDate,
      remarks: input.remarks,
      paymentMethod: input.paymentMethod || 'CASH',
      notes: input.notes,
      pettyCashRef: input.pettyCashRef,
    });

    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      action: 'EXPENSE_CREATED',
      entityType: 'Expense',
      entityId: newExpense.id,
      description: `Recorded expense of LKR ${input.amount.toFixed(2)} under ${finalCategoryName}`,
    });

    return newExpense;
  }
}
