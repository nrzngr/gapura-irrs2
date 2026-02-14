import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

// Complexity: Time O(1) | Space O(1)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            email, 
            password, 
            full_name, 
            nik, 
            phone, 
            station_id, 
            unit_id, 
            position_id,
            division // Only for GPS (central office)
        } = body;

        // Determine if this is a central office (GPS) registration
        // Check if station_id is 'GPS' string OR check the actual station code
        // We need to check this BEFORE validation because unit_id is optional for GPS
        let isGPS = station_id === 'GPS';
        if (!isGPS && station_id) {
            const { data: station } = await supabase
                .from('stations')
                .select('code')
                .eq('id', station_id)
                .single();
            if (station?.code === 'GPS') {
                isGPS = true;
            }
        }

        // Basic field validation
        // unit_id is NOT required if isGPS is true
        if (!email || !password || !full_name || !nik || !phone || !station_id || !position_id) {
             return NextResponse.json(
                { error: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        if (!isGPS && !unit_id) {
             return NextResponse.json(
                { error: 'Unit kerja wajib disi' },
                { status: 400 }
            );
        }

        // Password validation
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password minimal 6 karakter' },
                { status: 400 }
            );
        }

        // NIK validation: alphanumeric, 5-10 characters
        const nikRegex = /^[A-Z0-9]{5,10}$/i;
        if (!nikRegex.test(nik)) {
            return NextResponse.json(
                { error: 'NIK harus 5-10 karakter (huruf/angka)' },
                { status: 400 }
            );
        }

        // Phone validation: starts with 08, 10-13 digits
        const phoneRegex = /^08\d{8,11}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: 'Nomor HP harus dimulai 08 dan 10-13 digit' },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Format email tidak valid' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Email sudah terdaftar' },
                { status: 400 }
            );
        }

        // Check if NIK already exists
        const { data: existingNik } = await supabase
            .from('users')
            .select('id')
            .eq('nik', nik.toUpperCase())
            .single();

        if (existingNik) {
            return NextResponse.json(
                { error: 'NIK sudah terdaftar' },
                { status: 400 }
            );
        }



        // Hash password
        const hashedPassword = await hashPassword(password);

        // Determine role and division based on station
        // GPS users: role based on position (can be DIVISI_OS, DIVISI_OT, etc.)
        // Branch users: role = CABANG, division = GENERAL
        const userData = {
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name: full_name.trim(),
            nik: nik.toUpperCase(),
            phone,
            station_id: isGPS ? null : station_id, // GPS users don't have station_id
            unit_id,
            position_id,
            role: 'CABANG', // Default role, admin can upgrade
            division: isGPS && division ? division : 'GENERAL',
            status: 'pending',
        };

        const { error: insertError } = await supabase
            .from('users')
            .insert(userData);

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Gagal mendaftarkan user. Silakan coba lagi.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Registrasi berhasil. Mohon tunggu persetujuan admin.',
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
