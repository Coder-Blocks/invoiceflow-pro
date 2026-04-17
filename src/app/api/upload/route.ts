import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return new NextResponse('No file uploaded', { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return new NextResponse('Only image files are allowed', { status: 400 });
        }

        if (file.size > 2 * 1024 * 1024) {
            return new NextResponse('File size exceeds 2MB limit', { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = file.name.split('.').pop() || 'png';
        const filename = `${randomBytes(16).toString('hex')}.${ext}`;
        const filePath = `${session.user.activeOrgId}/${filename}`;

        const { error } = await supabaseAdmin.storage
            .from('organization-logos')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) throw error;

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('organization-logos')
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrlData.publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Upload failed',
            { status: 500 }
        );
    }
}