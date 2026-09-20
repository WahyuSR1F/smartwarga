export function pageAfterResidentQueryChange(): number {
  return 0;
}

export function residentPageOffset(page: number, limit = 20): number {
  return Math.max(0, page) * limit;
}
