'use client'

interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div className="fixed bottom-[74px] left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-[90%] rounded-pill bg-gray-11 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  )
}
