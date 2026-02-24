import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Basic server-side guardrail (client compresses first)
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5MB after compression)' }, { status: 413 });
    }

    const ext = file.type.includes('webp') ? 'webp' :
                file.type.includes('png') ? 'png' : 'jpg';
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const path = `reports/${id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('evidence')
      .upload(path, Buffer.from(arrayBuffer), { contentType: file.type, upsert: false });
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from('evidence').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl, path });
  } catch (e: any) {
    console.error('[UPLOAD_EVIDENCE_ERROR]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

