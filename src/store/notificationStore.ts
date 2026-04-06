import { create } from 'zustand'

interface NotificationStore {
  unreadCount: number
  setUnreadCount: (count: number) => void
  incrementUnreadCount: () => void
  decrementUnreadCount: () => void
  resetUnreadCount: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
}))
