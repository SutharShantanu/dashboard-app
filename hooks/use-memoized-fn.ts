// Source: https://shadcn-hooks.com/docs/hooks/use-memoized-fn
// A hook that returns a permanently stable function reference that always
// calls the latest version of the passed function. Eliminates the need for
// dependency arrays and prevents render loops caused by unstable handlers.

import { useRef, useEffect, useMemo } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Noop = (this: any, ...args: any[]) => any

export function useMemoizedFn<T extends Noop>(fn: T): T {
  const fnRef = useRef<T>(fn)

  // why not write `fnRef.current = fn`?
  // https://github.com/alibaba/hooks/issues/728
  fnRef.current = useMemo(() => fn, [fn])

  const memoizedFn = useRef<T | undefined>(undefined)
  if (!memoizedFn.current) {
    memoizedFn.current = function (this: any, ...args) {
      return fnRef.current.apply(this, args)
    } as T
  }

  return memoizedFn.current
}
