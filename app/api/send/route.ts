import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ message: 'Use POST /api/send/intent then /api/send/confirm' });
}

export async function POST() {
    return NextResponse.json(
        {
            error: 'Send requires confirmation. Use POST /api/send/intent then POST /api/send/confirm with your 6-digit code.',
        },
        { status: 400 }
    );
}
