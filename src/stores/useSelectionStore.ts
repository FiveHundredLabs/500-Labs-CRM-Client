import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SelectionState {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set, get) => ({
      selectedIds: [],
      setSelectedIds: (ids: string[]) =>
        set({ selectedIds: ids }, false, 'setSelectedIds'),
      toggleSelect: (id: string) => {
        const current = get().selectedIds;
        set(
          {
            selectedIds: current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id],
          },
          false,
          'toggleSelect'
        );
      },
      selectAll: (ids: string[]) =>
        set(
          { selectedIds: Array.from(new Set(ids)) },
          false,
          'selectAll'
        ),
      clearSelection: () =>
        set({ selectedIds: [] }, false, 'clearSelection'),
      isSelected: (id: string) => get().selectedIds.includes(id),
    }),
    {
      name: 'CRM-500Labs',
      store: 'selection',
      enabled: import.meta.env.DEV,
    }
  )
);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __SELECTION_STORE__: typeof useSelectionStore }).__SELECTION_STORE__ = useSelectionStore;
}
