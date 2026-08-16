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

    if (input.categoryName === 'Other' && input.customCategoryName && input.customCategoryName.trim() !== '') {
      finalCategoryName = input.customCategoryName.trim();
      // Optionally create a custom category record
      await expenseRepository.createCategory({
        name: finalCategoryName,
        isCustom: true,
      });
    }

    const newExpense = await expenseRepository.create({
      categoryId: input.categoryId,
      categoryName: finalCategoryName,
      amount: input.amount,
      expenseDate: input.expenseDate,
      remarks: input.remarks,
      createdBy: actor.id,
      createdByName: actor.fullName,
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
