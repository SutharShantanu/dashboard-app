// Source: https://shadcn-hooks.com/docs/hooks/use-memoized-fn
// A hook that returns a permanently stable function reference that always
// calls the latest version of the passed function. Eliminates the need for
// dependency arrays and prevents render loops caused by unstable handlers.

import { useMemo, useRef } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Noop = (this: any, ...args: any[]) => any

export function useMemoizedFn<T extends Noop>(fn: T): T {
  // Keep a ref that always points to the latest fn
  const fnRef = useRef<T>(fn)
  fnRef.current = useMemo(() => fn, [fn])

  // Create a single stable proxy that delegates to fnRef.current
  const memoizedFn = useRef<T>()
  if (!memoizedFn.current) {
    memoizedFn.current = function (this: unknown, ...args: Parameters<T>) {
      return fnRef.current.apply(this, args)
    } as T
  }

  return memoizedFn.current
}
