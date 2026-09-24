import { createContext, useContext } from 'react'

export const ToastContext = createContext(() => {})
export const ConfirmContext = createContext(async () => false)

// toast({ type: 'success' | 'error' | 'info', title, message })
export const useToast = () => useContext(ToastContext)

// const ok = await confirm({ title, message, confirmLabel, tone: 'danger' })
export const useConfirm = () => useContext(ConfirmContext)
