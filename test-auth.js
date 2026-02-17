const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testFetch() {
    const email = 'supervisor@gapura.demo';
    console.log('Testing fetch for:', email);
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();
        
    if (error) {
        console.error('Error:', JSON.stringify(error));
    } else {
        console.log('Success! User found:', data.email);
    }
}

testFetch();
