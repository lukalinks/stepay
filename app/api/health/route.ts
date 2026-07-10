export const dynamic = 'force-dynamic';

/** GET: Health check (no sensitive configuration details) */
export async function GET() {
    return Response.json({ ok: true });
}
