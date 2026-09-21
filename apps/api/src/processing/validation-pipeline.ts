import { CHECK_PASSED, type CheckOutcome, type ImageCheck } from './checks/image-check';
import { describeError } from './describe-error';
import type { ProcessingContext } from './processing-context';

/** Runs checks in order and stops at the first failure, so every rejected photo gets exactly one reason. */
export class ValidationPipeline {
  constructor(private readonly checks: readonly ImageCheck[]) {}

  async run(context: ProcessingContext): Promise<CheckOutcome> {
    for (const check of this.checks) {
      const outcome = await this.runCheck(check, context);
      if (!outcome.passed) return outcome;
    }
    return CHECK_PASSED;
  }

  private async runCheck(check: ImageCheck, context: ProcessingContext): Promise<CheckOutcome> {
    try {
      return await check.run(context);
    } catch (error) {
      throw new Error(`${check.name} check crashed: ${describeError(error)}`, { cause: error });
    }
  }
}
