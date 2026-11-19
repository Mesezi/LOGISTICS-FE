import { create } from 'zustand';
import type { Expense } from '@/lib/api';
interface UIStore {
  // Date filter (dashboard + other screens)
  activeDate: string; // YYYY-MM-DD
  setActiveDate: (date: string) => void;

  settingsTabRequest: 'Profile' | null;
  requestSettingsTab: (tab: 'Profile') => void;
  clearSettingsTabRequest: () => void;

  // Drawers
  jobDrawerOpen: boolean;
  editingJobId: number | null;
  openJobDrawer: (jobId?: number) => void;
  closeJobDrawer: () => void;

  paymentDrawerOpen: boolean;
  paymentJobId: number | null;
  openPaymentDrawer: (jobId: number) => void;
  closePaymentDrawer: () => void;

  expenseDrawerOpen: boolean;
  editingExpenseId: number | null;
  editingExpense: Expense | null;
  openExpenseDrawer: (expenseId?: number, expense?: Expense) => void;
  closeExpenseDrawer: () => void;

  // Job detail panel
  viewingJobId: number | null;
  openJobDetail: (jobId: number) => void;
  closeJobDetail: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeDate: '',
  setActiveDate: (date) => set({ activeDate: date }),

  settingsTabRequest: null,
  requestSettingsTab: (tab) => set({ settingsTabRequest: tab }),
  clearSettingsTabRequest: () => set({ settingsTabRequest: null }),

  jobDrawerOpen: false,
  editingJobId: null,
  openJobDrawer: (jobId) => set({ jobDrawerOpen: true, editingJobId: jobId ?? null }),
  closeJobDrawer: () => set({ jobDrawerOpen: false, editingJobId: null }),

  paymentDrawerOpen: false,
  paymentJobId: null,
  openPaymentDrawer: (jobId) => set({ paymentDrawerOpen: true, paymentJobId: jobId }),
  closePaymentDrawer: () => set({ paymentDrawerOpen: false, paymentJobId: null }),

  expenseDrawerOpen: false,
  editingExpenseId: null,
  editingExpense: null,
  openExpenseDrawer: (expenseId, expense) => set({
    expenseDrawerOpen: true,
    editingExpenseId: expenseId ?? null,
    editingExpense: expense ?? null,
  }),
  closeExpenseDrawer: () => set({ expenseDrawerOpen: false, editingExpenseId: null, editingExpense: null }),

  viewingJobId: null,
  openJobDetail: (jobId) => set({ viewingJobId: jobId }),
  closeJobDetail: () => set({ viewingJobId: null }),
}));
