import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ message: 'Use POST /api/sell/intent then /api/sell/confirm' });
}

export async function POST() {
    return NextResponse.json(
        {
            success: false,
            error: 'Cash out requires confirmation. Use POST /api/sell/intent then POST /api/sell/confirm with your 6-digit code.',
        },
        { status: 400 }
    );
}
