const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Envs');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'supervisor@gapura.demo';
const password = 'Gapura123!';

async function test() {
    console.log('Testing login for:', email);
    
    // 1. Fetch user
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();
    
    if (error) {
        console.error('User Fetch Error:', error);
        return;
    }
    
    if (!user) {
        console.error('User not found');
        return;
    }
    
    console.log('User found:', user.email);
    
    // 2. Verify password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
}

test();
