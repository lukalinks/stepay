import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('stepay_user')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('email, full_name, phone_number, address, id_document_type, id_document_number')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const fullName = (user.full_name ?? '').toString().trim();
        const phone = (user.phone_number ?? '').toString().trim();
        const address = (user.address ?? '').toString().trim();
        const idDocNumber = (user.id_document_number ?? '').toString().trim();
        const isProfileComplete = !!(fullName && phone.length >= 10 && address && idDocNumber);

        return NextResponse.json({
            email: user.email,
            fullName: user.full_name,
            phone: user.phone_number,
            address: user.address,
            idDocumentType: user.id_document_type,
            idDocumentNumber: user.id_document_number,
            isProfileComplete,
        });
    } catch (error) {
        console.error('Profile GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('stepay_user')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        const address = typeof body.address === 'string' ? body.address.trim() : '';
        const idDocumentType = typeof body.idDocumentType === 'string' ? body.idDocumentType.trim() : '';
        const idDocumentNumber = typeof body.idDocumentNumber === 'string' ? body.idDocumentNumber.trim() : '';

        if (fullName.length < 2 || fullName.length > 100) {
            return NextResponse.json({ error: 'Full name must be 2–100 characters' }, { status: 400 });
        }

        const phoneDigits = phone.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            return NextResponse.json({ error: 'Enter a valid Zambian mobile number (e.g. 0971234567)' }, { status: 400 });
        }

        if (address.length < 10 || address.length > 500) {
            return NextResponse.json({ error: 'Address must be 10–500 characters' }, { status: 400 });
        }

        const validIdTypes = ['nrc', 'passport'];
        if (!idDocumentType || !validIdTypes.includes(idDocumentType.toLowerCase())) {
            return NextResponse.json({ error: 'Select a valid ID type (NRC or Passport)' }, { status: 400 });
        }

        if (!idDocumentNumber || idDocumentNumber.length < 5) {
            return NextResponse.json({ error: 'Enter a valid ID number' }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                phone_number: phone,
                address,
                id_document_type: idDocumentType.toLowerCase(),
                id_document_number: idDocumentNumber,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Profile update error:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile PATCH Error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
