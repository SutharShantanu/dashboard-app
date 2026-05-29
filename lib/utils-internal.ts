/** Escapes special regex metacharacters to prevent ReDoS and query injection. */
export function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
