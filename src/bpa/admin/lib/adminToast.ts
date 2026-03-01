'use client'

import { toast } from 'react-toastify'

const defaultOptions = { position: 'top-right' as const, autoClose: 3000 }

/**
 * Admin toast notifications (uses react-toastify; admin layout provides ToastContainer).
 */
export const adminToast = {
  success: (message: string) => toast.success(message, defaultOptions),
  error: (message: string) => toast.error(message, { ...defaultOptions, autoClose: 5000 }),
  warning: (message: string) => toast.warning(message, defaultOptions),
  info: (message: string) => toast.info(message, defaultOptions),
}
