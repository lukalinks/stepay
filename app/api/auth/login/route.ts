import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { cookies } from 'next/headers';

export async function GET() {
    return NextResponse.json({ message: 'Use POST with { phone } to log in.' });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone || phone.length < 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
        }

        // Normalize phone for lookup (support +260, 260, 0xx formats)
        const normalized = phone.replace(/\s+/g, '').replace(/^0/, '');
        const phoneForDb = normalized.startsWith('+260') ? normalized : normalized.startsWith('260') ? `+${normalized}` : `+260${normalized}`;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phoneForDb)
            .single();

        let user = existingUser;

        if (!user) {
            // Create new user with Stellar Wallet
            const keypair = StellarService.generateAccount();

            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    phone_number: phoneForDb,
                    pin_hash: '1234',
                    wallet_public: keypair.publicKey,
                    wallet_secret: keypair.secretKey,
                })
                .select()
                .single();

            if (error) throw error;
            user = newUser;
        }

        // Set session cookie
        const cookieStore = await cookies();
        cookieStore.set('stepay_user', user.id, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        // Never expose wallet_secret to client
        const { wallet_secret: _, walletSecret: __, ...safeUser } = user as { wallet_secret?: string; walletSecret?: string; [k: string]: unknown };
        return NextResponse.json({ success: true, user: safeUser });

    } catch (error: any) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { success: false, error: 'Login failed' },
            { status: 500 }
        );
    }
}
