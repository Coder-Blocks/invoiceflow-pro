import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
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

        // Validate file type (only images)
        if (!file.type.startsWith('image/')) {
            return new NextResponse('Only image files are allowed', { status: 400 });
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return new NextResponse('File size exceeds 2MB limit', { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const ext = path.extname(file.name).toLowerCase();
        const filename = `${randomBytes(16).toString('hex')}${ext}`;

        // Ensure uploads directory exists and is writable
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await access(uploadDir, constants.W_OK);
        } catch {
            await mkdir(uploadDir, { recursive: true });
        }

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        const url = `/uploads/${filename}`;

        return NextResponse.json({ url }, { status: 200 });
    } catch (error) {
        console.error('Upload error:', error);
        return new NextResponse(
            error instanceof Error ? error.message : 'Upload failed',
            { status: 500 }
        );
    }
}