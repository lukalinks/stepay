/**
 * Parses Stellar/Horizon API errors into user-friendly messages.
 * Handles 400 responses from submitTransaction and similar.
 */
export function parseStellarError(error: unknown): string {
  const err = error as Record<string, unknown>;
  const resp = err?.response as Record<string, unknown> | undefined;
  // Horizon error body: can be resp, resp.data, or resp.json (Stellar SDK BadResponseError)
  let body = (resp && ('extras' in resp || 'result_codes' in resp)
    ? resp
    : (resp?.data ?? resp?._data ?? (typeof resp?.json === 'function' ? undefined : resp))) as Record<string, unknown> | undefined;
  if (!body && resp) body = resp as Record<string, unknown>;
  const extras = (body?.extras ?? body) as Record<string, unknown> | undefined;
  const rc = (extras?.result_codes ?? body?.result_codes) as { transaction?: string; operations?: string[] } | undefined;
  let ops = rc?.operations ?? [];
  const txCode = rc?.transaction;
  let rawMsg = String(err?.message ?? 'Transaction failed.');
  // Fallback: parse op codes from error message if present
  if (ops.length === 0 && rawMsg) {
    const opMatch = rawMsg.match(/op_[a-z_]+/g);
    if (opMatch) ops = opMatch;
  }

  const OP_MESSAGES: Record<string, string> = {
    op_no_trust: 'Recipient does not have a USDC trustline. Add USDC support first.',
    op_low_reserve: 'Insufficient XLM for network fees. Keep at least 1 XLM in your wallet for reserves.',
    op_underfunded: 'Insufficient balance. Reserve some XLM for network fees.',
    op_no_destination: 'Destination account does not exist.',
    op_line_full: 'Recipient has reached their USDC limit.',
    op_no_source_account: 'Account error. Please try again.',
    op_src_no_trust: 'You do not have a USDC trustline. Add USDC to your wallet first.',
    op_src_not_authorized: 'You are not authorized to send this asset.',
    op_not_authorized: 'Recipient is not authorized to hold this asset.',
    op_bad_auth: 'Invalid signature. Please try again.',
    op_insufficient_funds: 'Insufficient balance. Reserve some XLM for network fees.',
  };

  let msg: string | undefined;
  for (const op of ops) {
    if (OP_MESSAGES[op]) {
      msg = OP_MESSAGES[op];
      break;
    }
  }
  if (!msg) {
    if (rawMsg.includes('op_no_trust')) msg = OP_MESSAGES.op_no_trust;
    else if (rawMsg.includes('op_low_reserve')) msg = OP_MESSAGES.op_low_reserve;
    else if (rawMsg.includes('op_underfunded')) msg = OP_MESSAGES.op_underfunded;
    else if (rawMsg.includes('op_src_no_trust')) msg = OP_MESSAGES.op_src_no_trust;
    else if (rawMsg.includes('op_insufficient_funds')) msg = OP_MESSAGES.op_insufficient_funds;
  }
  if (!msg) {
    const isGenericFailure =
      (typeof body?.detail === 'string' && (
        body.detail.includes('extras.result_codes') ||
        body.detail.includes('transaction failed when submitted') ||
        body.detail.includes('stellar.org')
      )) ||
      rawMsg.includes('Request failed with status code') ||
      rawMsg.includes('Transaction submission failed') ||
      rawMsg.includes('transaction failed when submitted');

    if (isGenericFailure) {
      const codeHint = ops[0] ?? txCode;
      msg = txCode === 'tx_insufficient_fee'
        ? 'Network fee too low. Please try again.'
        : txCode === 'tx_bad_seq'
          ? 'Sequence conflict. Please try again in a few seconds.'
          : codeHint
            ? `Transfer failed (${codeHint}). Check your balance and try again.`
            : 'Transfer failed. Check your balance (keep some XLM for fees) and try again.';
    } else if (typeof body?.detail === 'string') {
      msg = body.detail;
    } else {
      msg = rawMsg;
    }
  }
  let final = msg ?? 'Transfer failed. Please try again.';
  if (final.includes('extras.result_codes') || final.includes('stellar.org/api/errors')) {
    const codeHint = ops[0] ?? txCode;
    final = codeHint
      ? `Transfer failed (${codeHint}). Check your balance and try again.`
      : 'Transfer failed. Check your balance (keep some XLM for fees) and try again.';
  }
  return final;
}
