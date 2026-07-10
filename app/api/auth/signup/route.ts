import { NextResponse } from 'next/server';

/** Legacy signup endpoint — account creation now requires email OTP verification. */
export async function GET() {
    return NextResponse.json({
        message: 'Use POST /api/auth/signup/intent then POST /api/auth/signup/verify with your email OTP.',
    });
}

export async function POST() {
    return NextResponse.json(
        {
            error: 'Email verification is required. Use POST /api/auth/signup/intent to receive a code, then POST /api/auth/signup/verify.',
        },
        { status: 400 }
    );
}
