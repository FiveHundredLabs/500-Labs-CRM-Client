import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: [],
  setSelectedIds: (ids: string[]) => set({ selectedIds: ids }),
  toggleSelect: (id: string) => {
    const current = get().selectedIds;
    set({
      selectedIds: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  },
  selectAll: (ids: string[]) => set({ selectedIds: Array.from(new Set(ids)) }),
  clearSelection: () => set({ selectedIds: [] }),
  isSelected: (id: string) => get().selectedIds.includes(id),
}));
