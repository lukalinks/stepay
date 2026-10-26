/** Prevents background USDC trustline txs from racing client payment signing. */
let signingCount = 0;

export function beginClientSigning(): void {
    signingCount++;
}

export function endClientSigning(): void {
    signingCount = Math.max(0, signingCount - 1);
}

export function isClientSigning(): boolean {
    return signingCount > 0;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
