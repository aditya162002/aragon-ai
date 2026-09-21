import { describe, expect, it, vi } from 'vitest';
import { RejectionReason } from '../../src/generated/prisma/enums';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from '../../src/processing/checks/image-check';
import { ValidationPipeline } from '../../src/processing/validation-pipeline';
import { contextWith } from './test-doubles';

function stubCheck(name: string, outcome: CheckOutcome | Error): ImageCheck & { run: ReturnType<typeof vi.fn> } {
  const run = vi.fn(async () => {
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  return { name, run };
}

describe('ValidationPipeline', () => {
  it('stops at the first failing check', async () => {
    const first = stubCheck('first', CHECK_PASSED);
    const failing = stubCheck('failing', checkFailed(RejectionReason.RESOLUTION_TOO_LOW));
    const never = stubCheck('never', checkFailed(RejectionReason.BLURRY));

    const outcome = await new ValidationPipeline([first, failing, never]).run(contextWith(null));

    expect(outcome).toEqual({ passed: false, reason: RejectionReason.RESOLUTION_TOO_LOW });
    expect(first.run).toHaveBeenCalledOnce();
    expect(failing.run).toHaveBeenCalledOnce();
    expect(never.run).not.toHaveBeenCalled();
  });

  it('passes when every check passes, running them in order with the same context', async () => {
    const checks = [stubCheck('a', CHECK_PASSED), stubCheck('b', CHECK_PASSED)];
    const context = contextWith(null);

    await expect(new ValidationPipeline(checks).run(context)).resolves.toEqual({ passed: true });
    for (const check of checks) expect(check.run).toHaveBeenCalledWith(context);
  });

  it('propagates infrastructure errors, naming the check that crashed', async () => {
    const crashing = stubCheck('face', new Error('onnxruntime exploded'));
    await expect(new ValidationPipeline([crashing]).run(contextWith(null))).rejects.toThrow(
      'face check crashed: onnxruntime exploded',
    );
  });
});
