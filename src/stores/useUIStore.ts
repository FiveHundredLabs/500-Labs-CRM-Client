import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  modalData: unknown;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      modalData: null,
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),
      setSidebarOpen: (open: boolean) =>
        set({ sidebarOpen: open }, false, 'setSidebarOpen'),
      openModal: (modalId: string, data?: unknown) =>
        set(
          { activeModal: modalId, modalData: data ?? null },
          false,
          'openModal'
        ),
      closeModal: () =>
        set({ activeModal: null, modalData: null }, false, 'closeModal'),
    }),
    {
      name: 'CRM-500Labs',
      store: 'ui',
      enabled: import.meta.env.DEV,
    }
  )
);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __UI_STORE__: typeof useUIStore }).__UI_STORE__ = useUIStore;
}
