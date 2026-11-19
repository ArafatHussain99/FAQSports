export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // Pass incoming deep links through unchanged so they reach their own screen.
  return path;
}
