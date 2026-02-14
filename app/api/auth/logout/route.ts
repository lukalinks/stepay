import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    return NextResponse.json({ message: 'Use POST to log out.' });
}

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete('stepay_user');
    return NextResponse.json({ success: true });
}
