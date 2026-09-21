import type { RejectionReason } from '../../generated/prisma/enums';
import type { ProcessingContext } from '../processing-context';

export type CheckOutcome = { passed: true } | { passed: false; reason: RejectionReason };

/**
 * One validation rule. A failed rule is a normal outcome (a verdict), never an exception;
 * checks only throw on infrastructure/programming errors, which the worker retries.
 */
export interface ImageCheck {
  readonly name: string;
  run(context: ProcessingContext): Promise<CheckOutcome>;
}

export const CHECK_PASSED: CheckOutcome = { passed: true };

export function checkFailed(reason: RejectionReason): CheckOutcome {
  return { passed: false, reason };
}
