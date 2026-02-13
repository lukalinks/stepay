import * as StellarSdk from '@stellar/stellar-sdk';
import { USDC_ISSUER } from './constants';

const HORIZON_URL = 'https://horizon.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const networkPassphrase = StellarSdk.Networks.PUBLIC;

/** Minimum XLM to create a new account (mainnet reserve) */
const MIN_ACCOUNT_BALANCE = '1';

/** USDC asset on Stellar mainnet (Circle) */
const USDC_ASSET = new StellarSdk.Asset('USDC', USDC_ISSUER);

export class StellarService {
    /**
     * Generates a new random keypair (Public/Secret key)
     */
    static generateAccount() {
        const pair = StellarSdk.Keypair.random();
        return {
            publicKey: pair.publicKey(),
            secretKey: pair.secret(),
        };
    }

    /**
     * Checks XLM balance for a given public key
     */
    static async getBalance(publicKey: string): Promise<string> {
        try {
            const account = await server.loadAccount(publicKey);
            const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
            return xlmBalance ? xlmBalance.balance : '0';
        } catch (error) {
            return '0';
        }
    }

    /**
     * Checks USDC balance for a given public key
     */
    static async getUSDCBalance(publicKey: string): Promise<string> {
        try {
            const account = await server.loadAccount(publicKey);
            const usdcBalance = account.balances.find(
                (b) => b.asset_type === 'credit_alphanum4' && (b as { asset_code?: string }).asset_code === 'USDC'
            );
            return usdcBalance ? usdcBalance.balance : '0';
        } catch (error) {
            return '0';
        }
    }

    /**
     * Check if account has USDC trustline
     */
    static async hasUSDCTrustline(publicKey: string): Promise<boolean> {
        try {
            const account = await server.loadAccount(publicKey);
            return account.balances.some(
                (b) => b.asset_type === 'credit_alphanum4' && (b as { asset_code?: string }).asset_code === 'USDC'
            );
        } catch {
            return false;
        }
    }

    /**
     * Ensure user has USDC trustline (create if missing). Uses user's secret. Returns true if trustline exists or was created.
     */
    static async ensureUSDCTrustline(userSecret: string): Promise<void> {
        const keypair = StellarSdk.Keypair.fromSecret(userSecret);
        const hasTrust = await this.hasUSDCTrustline(keypair.publicKey());
        if (hasTrust) return;

        const sourceAccount = await server.loadAccount(keypair.publicKey());
        const tx = new StellarSdk.TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase })
            .addOperation(StellarSdk.Operation.changeTrust({ asset: USDC_ASSET, limit: '1000000' }))
            .setTimeout(30)
            .build();
        tx.sign(keypair);
        await server.submitTransaction(tx);
    }

    /**
     * Sends USDC from source to destination. Dest must have trustline (call ensureUSDCTrustline first if needed).
     */
    static async sendUSDC(sourceSecret: string, destAddress: string, amount: string, memo?: string): Promise<string> {
        const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
        const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

        const operation = StellarSdk.Operation.payment({
            destination: destAddress,
            asset: USDC_ASSET,
            amount: String(amount),
        });

        let txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase })
            .addOperation(operation)
            .setTimeout(30);

        if (memo) {
            txBuilder = txBuilder.addMemo(StellarSdk.Memo.text(memo));
        }

        const transaction = txBuilder.build();
        transaction.sign(sourceKeypair);

        const result = await server.submitTransaction(transaction);
        console.log('Stellar USDC Transaction Success:', result.hash);
        return result.hash;
    }

    /**
     * Check if an account exists on the network
     */
    static async accountExists(publicKey: string): Promise<boolean> {
        try {
            await server.loadAccount(publicKey);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sends XLM from a source wallet to a destination address.
     * Uses CreateAccount for new accounts (>= 1 XLM), Payment for existing.
     */
    static async sendXLM(sourceSecret: string, destAddress: string, amount: string, memo?: string) {
        try {
            const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
            const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

            const amountNum = parseFloat(amount);
            const destExists = await this.accountExists(destAddress);

            let operation;
            if (!destExists) {
                const startingBalance = Math.max(amountNum, parseFloat(MIN_ACCOUNT_BALANCE)).toFixed(7);
                if (amountNum < parseFloat(MIN_ACCOUNT_BALANCE)) {
                    throw new Error(`Minimum ${MIN_ACCOUNT_BALANCE} XLM required to create new account.`);
                }
                operation = StellarSdk.Operation.createAccount({
                    destination: destAddress,
                    startingBalance,
                });
            } else {
                operation = StellarSdk.Operation.payment({
                    destination: destAddress,
                    asset: StellarSdk.Asset.native(),
                    amount: amount,
                });
            }

            let transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase,
            })
                .addOperation(operation)
                .setTimeout(30);

            if (memo) {
                transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
            }

            const transaction = transactionBuilder.build();
            transaction.sign(sourceKeypair);

            const result = await server.submitTransaction(transaction);
            console.log('Stellar Transaction Success:', result.hash);
            return result.hash;
        } catch (error: any) {
            console.error('Stellar Transaction Failed:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Monitors an account for incoming transactions (Simplified polling)
     * In production, use Stellar SDK's streaming capability
     */
    static async checkRecentTransactions(publicKey: string, limit = 5) {
        try {
            const resp = await server.transactions()
                .forAccount(publicKey)
                .limit(limit)
                .order('desc')
                .call();

            return resp.records;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }


    /**
     * Check if a specific memo text exists in recent transactions for an account
     * Used to verify deposits. Horizon may return memo as raw string or base64.
     */
    static async checkMemoTransaction(accountPublicKey: string, memoToCheck: string) {
        try {
            const transactions = await this.checkRecentTransactions(accountPublicKey, 20);

            const decodeMemo = (m: string): string => {
                if (!m) return '';
                try {
                    if (/^[A-Za-z0-9+/=]+$/.test(m) && m.length % 4 === 0) {
                        return Buffer.from(m, 'base64').toString('utf8');
                    }
                } catch { /* ignore */ }
                return m;
            };

            const match = transactions.find((tx: { memo_type?: string; memo?: string }) => {
                if (tx.memo_type !== 'text') return false;
                const memo = tx.memo ?? '';
                return memo === memoToCheck || decodeMemo(memo) === memoToCheck;
            });

            return match || null;
        } catch (error) {
            console.error('Error checking memo:', error);
            return null;
        }
    }
}
