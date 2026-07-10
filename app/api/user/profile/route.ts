import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { getMarket, isSupportedCountry, marketToJson } from '@/lib/markets';
import {
    formatPhoneE164ForMarket,
    isValidPhoneForMarket,
    normalizePhoneForMarket,
} from '@/lib/phone';
import { autoClaimPendingForUser } from '@/lib/phone-pay';
import { isPhoneUsedByOtherUser, isUniquePhoneViolation } from '@/lib/user-phone';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRows = await sql`
            SELECT email, full_name, phone_number, address, id_document_type, id_document_number,
                   wallet_public, wallet_secret, wallet_secret_enc,
                   wallet_backup_enc, wallet_backup_enabled, country_code
            FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = userRows[0] as Record<string, unknown> | undefined;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const fullName = String(user.full_name ?? '').trim();
        const phone = String(user.phone_number ?? '').trim();
        const address = String(user.address ?? '').trim();
        const idDocNumber = String(user.id_document_number ?? '').trim();
        const isProfileComplete = !!(fullName && phone.length >= 10 && address && idDocNumber);
        const walletCustody =
            user.wallet_secret_enc || (user.wallet_secret && String(user.wallet_secret).trim())
                ? ('hosted' as const)
                : ('self' as const);
        const hasCloudBackup = Boolean(user.wallet_backup_enabled && user.wallet_backup_enc);
        const cloudBackupEnabled = Boolean(user.wallet_backup_enabled);
        const countryCode = String(user.country_code ?? 'ZM');
        const market = getMarket(countryCode);

        return NextResponse.json({
            userId,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone_number,
            address: user.address,
            idDocumentType: user.id_document_type,
            idDocumentNumber: user.id_document_number,
            walletPublic: user.wallet_public,
            walletCustody,
            hasCloudBackup,
            cloudBackupEnabled,
            countryCode: market.countryCode,
            currency: market.currency,
            market: marketToJson(market),
            isProfileComplete,
        });
    } catch (error) {
        console.error('Profile GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const address = typeof body.address === 'string' ? body.address.trim() : '';
        const idDocumentType = typeof body.idDocumentType === 'string' ? body.idDocumentType.trim() : '';
        const idDocumentNumber = typeof body.idDocumentNumber === 'string' ? body.idDocumentNumber.trim() : '';
        const countryCodeRaw = typeof body.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : '';

        const existingRows = await sql`SELECT country_code FROM users WHERE id = ${userId} LIMIT 1`;
        const existingCountry = String(existingRows[0]?.country_code ?? 'ZM');
        const countryCode = countryCodeRaw && isSupportedCountry(countryCodeRaw) ? countryCodeRaw : existingCountry;
        const market = getMarket(countryCode);

        if (fullName.length < 2 || fullName.length > 100) {
            return NextResponse.json({ error: 'Full name must be 2–100 characters' }, { status: 400 });
        }

        const phoneDigits = phone.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
        if (phoneDigits.length < 9) {
            return NextResponse.json(
                { error: `Enter a valid mobile money number for ${market.countryName}.` },
                { status: 400 }
            );
        }

        if (!isValidPhoneForMarket(phone, countryCode)) {
            return NextResponse.json(
                { error: `Enter a valid mobile money number for ${market.countryName}.` },
                { status: 400 }
            );
        }

        if (address.length < 10 || address.length > 500) {
            return NextResponse.json({ error: 'Address must be 10–500 characters' }, { status: 400 });
        }

        const validIdTypes = market.idDocumentTypes.map((t) => t.id);
        if (!idDocumentType || !validIdTypes.includes(idDocumentType.toLowerCase())) {
            return NextResponse.json({ error: 'Select a valid ID type' }, { status: 400 });
        }

        if (!idDocumentNumber || idDocumentNumber.length < 5) {
            return NextResponse.json({ error: 'Enter a valid ID number' }, { status: 400 });
        }

        if (await isPhoneUsedByOtherUser(userId, phone)) {
            return NextResponse.json(
                { error: 'This mobile money number is already linked to another Stepay account.' },
                { status: 400 }
            );
        }

        await sql`
            UPDATE users SET
                full_name = ${fullName},
                phone_number = ${phone},
                phone_normalized = ${normalizePhoneForMarket(phone, countryCode)},
                address = ${address},
                id_document_type = ${idDocumentType.toLowerCase()},
                id_document_number = ${idDocumentNumber},
                country_code = ${countryCode},
                updated_at = NOW()
            WHERE id = ${userId}
        `;

        const claimed = await autoClaimPendingForUser(userId);

        return NextResponse.json({ success: true, claimedTransfers: claimed });
    } catch (error) {
        console.error('Profile PATCH Error:', error);
        if (isUniquePhoneViolation(error)) {
            return NextResponse.json(
                { error: 'This mobile money number is already linked to another Stepay account.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
