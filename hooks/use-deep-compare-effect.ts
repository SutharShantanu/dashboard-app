import { useEffect, useRef, type DependencyList, type EffectCallback } from "react"

/**
 * A deep comparison hook inspired by shadcn-hooks' useDeepCompareEffect.
 * @see https://shadcn-hooks.com/docs/hooks/use-deep-compare-effect
 *
 * Works like React.useEffect but uses deep comparison on the dependency list
 * instead of reference equality. This prevents infinite loops when dependencies
 * are objects/arrays that are structurally equal but referentially different
 * on each render.
 */

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false
  }

  const isArrA = Array.isArray(a)
  const isArrB = Array.isArray(b)

  if (isArrA !== isArrB) return false

  if (isArrA && isArrB) {
    const arrA = a as unknown[]
    const arrB = b as unknown[]
    if (arrA.length !== arrB.length) return false
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i])) return false
    }
    return true
  }

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false
    }
  }

  return true
}

function useDeepCompareMemoize(deps: DependencyList): DependencyList {
  const ref = useRef<DependencyList>(deps)

  if (!deepEqual(deps, ref.current)) {
    ref.current = deps
  }

  return ref.current
}

export function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, useDeepCompareMemoize(deps))
}
