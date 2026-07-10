import { NextResponse } from 'next/server';
import { probeLencoAuth } from '@/lib/lenco-config';

/** Dev helper — checks whether Lenco accepts LENCO_SECRET_KEY. */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const result = await probeLencoAuth();
    return NextResponse.json({
        lencoAuthOk: result.ok,
        httpStatus: result.status,
        lencoErrorCode: result.errorCode ?? null,
        lencoMessage: result.message ?? null,
        secretKeyHint: result.secretDiagnosis,
        fix:
            result.secretDiagnosis ??
            (result.ok
                ? null
                : 'Open Lenco Pay → APIs in your Lenco dashboard. Copy the Secret Key (not the webhook hash) into LENCO_SECRET_KEY, restart the dev server, and try again.'),
    });
}
