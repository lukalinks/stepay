import { NextResponse } from 'next/server';
import { getAccessSettings, getPendingInviteByToken } from '@/lib/access-control';

/** Public access status for signup UI (no secrets). */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const inviteToken = url.searchParams.get('invite')?.trim() || '';
        const access = await getAccessSettings();
        const inviteRequired = !access.publicLaunch;

        let inviteValid = false;
        let inviteEmail: string | null = null;
        if (inviteToken) {
            const invite = await getPendingInviteByToken(inviteToken);
            if (invite) {
                inviteValid = true;
                inviteEmail = invite.email;
            }
        }

        return NextResponse.json(
            {
                publicLaunch: access.publicLaunch,
                inviteRequired,
                inviteValid,
                inviteEmail,
            },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    } catch (err) {
        console.error('GET /api/access:', err);
        // Fail closed — closed beta until settings are readable again.
        return NextResponse.json(
            {
                publicLaunch: false,
                inviteRequired: true,
                inviteValid: false,
                inviteEmail: null,
                error: 'access_unavailable',
            },
            { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }
}
