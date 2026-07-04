import { NextResponse } from 'next/server';
import { checkAllEnvFields } from '@/lib/env-check';

/** Dev-only — reports .env field presence, formats, DB, and Lenco auth. */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const report = await checkAllEnvFields();
    const failed = report.fields.filter((f) => !f.ok);

    return NextResponse.json({
        ok: failed.length === 0 && report.dbOk && report.lencoAuth.ok,
        summary: {
            envFieldsOk: failed.length === 0,
            dbOk: report.dbOk,
            lencoAuthOk: report.lencoAuth.ok,
            lencoSecretHint: report.lencoAuth.secretDiagnosis,
        },
        fields: report.fields,
        lenco: {
            httpStatus: report.lencoAuth.status,
            errorCode: report.lencoAuth.errorCode ?? null,
            message: report.lencoAuth.message ?? null,
        },
    });
}
