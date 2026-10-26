import { NextResponse } from 'next/server';
import { buildStellarToml, isTestnetTomlHost } from '@/lib/sep1-toml';
import { headers } from 'next/headers';

/** SEP-0001 — publicly readable stellar.toml (mainnet or testnet by Host). */
export async function GET() {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const network = isTestnetTomlHost(host) ? 'testnet' : 'public';

    try {
        const body = buildStellarToml(network);
        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'stellar.toml unavailable';
        return new NextResponse(`# error\n# ${msg}\n`, {
            status: 503,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
