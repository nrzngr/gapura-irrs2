import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, full_name, nik, phone, station_id, unit_id, position_id } = body;

        // Validasi
        if (!email || !password || !full_name || !nik || !phone || !station_id || !unit_id || !position_id) {
            return NextResponse.json(
                { error: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password minimal 6 karakter' },
                { status: 400 }
            );
        }

        // Cek email sudah dipakai
        const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Email sudah terdaftar' },
                { status: 400 }
            );
        }

        // Cek NIK sudah dipakai
        const { data: existingNik } = await supabase
            .from('users')
            .select('id')
            .eq('nik', nik)
            .single();

        if (existingNik) {
            return NextResponse.json(
                { error: 'NIK sudah terdaftar' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                email,
                password: hashedPassword,
                full_name,
                nik,
                phone,
                station_id,
                unit_id,
                position_id,
                role: 'reporter', // Default role
                status: 'pending',
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Gagal mendaftarkan user' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Registrasi berhasil. Mohon tunggu persetujuan admin.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
