export const dynamic = 'force-dynamic';

/** GET: Simple health check - confirms the app is running */
export async function GET() {
  return Response.json({ ok: true });
}
