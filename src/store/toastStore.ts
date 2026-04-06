import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2, 9)
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

// Convenience functions
export const toast = {
  success: (message: string) => useToastStore.getState().addToast('success', message),
  error: (message: string) => useToastStore.getState().addToast('error', message),
  info: (message: string) => useToastStore.getState().addToast('info', message),
}
