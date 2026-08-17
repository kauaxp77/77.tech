const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseServiceKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
});

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Service Key or URL in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function makeEveryoneAdmin() {
    try {
        console.log('Fetching all users...');
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        console.log('Found ' + users.length + ' users. Promoting all to admin...');

        for (const user of users) {
            const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: { role: 'admin' }
            });

            if (updateError) {
                console.error('Failed to update user ' + user.email + ':', updateError.message);
            } else {
                console.log('Successfully promoted ' + user.email + ' to ADMIN.');
            }
        }
        console.log('Done!');
    } catch (err) {
        console.error('Script fault:', err);
    }
}

makeEveryoneAdmin();
