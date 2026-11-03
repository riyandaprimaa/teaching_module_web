'use client'

import * as React from 'react'

export interface ToastProps {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: 'default' | 'destructive'
}

type ToastActionElement = React.ReactElement

interface State {
  toasts: ToastProps[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: { type: 'ADD_TOAST'; toast: ToastProps } | { type: 'DISMISS_TOAST'; toastId?: string }) {
  if (action.type === 'ADD_TOAST') {
    const id = action.toast.id || Math.random().toString(36).substring(2, 9)
    memoryState = {
      ...memoryState,
      toasts: [...memoryState.toasts, { ...action.toast, id }],
    }
    const timeout = setTimeout(() => {
      dispatch({ type: 'DISMISS_TOAST', toastId: id })
    }, 4000)
    toastTimeouts.set(id, timeout)
  } else if (action.type === 'DISMISS_TOAST') {
    memoryState = {
      ...memoryState,
      toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
    }
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export function toast(props: ToastProps) {
  dispatch({ type: 'ADD_TOAST', toast: props })
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

