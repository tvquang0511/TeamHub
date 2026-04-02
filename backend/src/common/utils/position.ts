import { Prisma } from "@prisma/client";

/**
 * Compute a new position value using prev/next anchors.
 *
 * Contract:
 * - If both prev and next are present: position = (prev + next) / 2
 * - If only prev is present: position = prev + 1
 * - If only next is present: position = next - 1
 * - If neither is present: position = now (monotonic-ish for MVP)
 */
export function computeBetweenPosition(
  prev: Prisma.Decimal | null | undefined,
  next: Prisma.Decimal | null | undefined,
): Prisma.Decimal {
  if (prev != null && next != null) {
    // (prev + next) / 2
    return prev.plus(next).dividedBy(new Prisma.Decimal(2));
  }

  if (prev != null) {
    return prev.plus(new Prisma.Decimal(1));
  }

  if (next != null) {
    return next.minus(new Prisma.Decimal(1));
  }

  return new Prisma.Decimal(Date.now());
}
