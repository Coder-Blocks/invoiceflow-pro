import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) return new NextResponse('No file uploaded', { status: 400 });
        if (!file.type.startsWith('image/')) return new NextResponse('Only image files are allowed', { status: 400 });
        if (file.size > 2 * 1024 * 1024) return new NextResponse('File size exceeds 2MB limit', { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const filePath = `${timestamp}-${randomString}.${fileExtension}`;

        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(filePath, buffer, { contentType: file.type, upsert: false });

        if (error) {
            console.error('Supabase upload error:', error);
            return new NextResponse(error.message, { status: 500 });
        }

        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(data.path);
        return NextResponse.json({ url: urlData.publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return new NextResponse(error instanceof Error ? error.message : 'Upload failed', { status: 500 });
    }
}