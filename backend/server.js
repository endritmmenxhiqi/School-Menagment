const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const redis = require('redis');
const cron = require('node-cron'); // Paketa për oraret automatike
require('dotenv').config();

const app = express();

// --- 1. LIDHJA ME SUPABASE ---
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// Admin client (requires SERVICE ROLE key in .env)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- 2. LIDHJA ME REDIS CLOUD ---
const redisClient = redis.createClient({
    password: 'ULxd9l3jPCONQZBUK8hfmgNw18bpw9FE',
    socket: {
        host: 'redis-11394.crce282.eu-west-3-1.ec2.cloud.redislabs.com',
        port: 11394
    }
});

redisClient.on('error', err => console.log('❌ Redis Cloud Error:', err));

// --- FUNKSIONI KRYESOR PËR RESETIMIN E SISTEMIT ---
const resetQueueSystem = async () => {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    try {
        const keys = await redisClient.keys('*');
        const queueKeys = keys.filter(k => k.startsWith('queue:') || k.startsWith('ticket_count:') || k.startsWith('current:'));

        console.log(`🔍 [${new Date().toLocaleString()}] Gjetëm ${queueKeys.length} çelësa për reset:`, queueKeys);

        if (queueKeys.length > 0) {
            await redisClient.del(...queueKeys);
            console.log(`🧹 [${new Date().toLocaleString()}] Sistemi u resetua: Radhët filluan nga 0.`);
        } else {
            console.log(`✅ [${new Date().toLocaleString()}] Sistemi është i pastër, nuk kishte të dhëna për të fshirë.`);
        }
        
        // Ruajmë datën e fundit kur kemi bërë reset
        await redisClient.set('last_reset_date', today);
        console.log(`📅 [${new Date().toLocaleString()}] Data e resetit u vendos në: ${today}`);
    } catch (err) {
        console.error('❌ Gabim gjatë resetimit:', err);
    }
};

(async () => {
    try {
        await redisClient.connect();
        console.log('🚀 Redis Cloud: I lidhur me sukses!');
        // NUK resetojmë më në startup - biletat mbeten aktive
        // Resetimi bëhet vetëm automatikisht në mesnatë
    } catch (err) {
        console.error('❌ Nuk u lidh me Redis Cloud:', err);
    }
})();

// --- 3. ORARI AUTOMATIK (CRON JOB) ---
// Ky kod ekzekutohet saktësisht në ora 00:00:01 çdo natë sipas kohës sonë
cron.schedule('1 0 0 * * *', () => {
    console.log('⏰ Mesnata! Duke pastruar radhët për ditën e re...');
    resetQueueSystem();
}, {
    scheduled: true,
    timezone: "Europe/Tirane" 
});

// --- 4. MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// --- AUTH ROUTES ---

app.post('/api/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    
    // 1. Regjistrimi në Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email, 
        password, 
        options: { data: { fullName } }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Krijimi i profilit në tabelën 'profiles'
    if (authData.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: authData.user.id, 
                    full_name: fullName, 
                    role: 'nxenes',
                    email: email
                }
            ]);

        if (profileError) {
            console.error('❌ Gabim në krijimin e profilit:', profileError.message);
            // Nuk e kthejmë 400 këtu sepse llogaria në Auth u krijua, 
            // por e logojmë për debugim.
        }
    }

    res.status(200).json({ message: "Llogaria u krijua!", data: authData });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        console.error('❌ Supabase login error:', error.message, error.status, error.code);
        return res.status(400).json({ error: error.message });
    }

    console.log('✅ Login success, user:', data.user.id);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, department, full_name')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        console.error('❌ Profile fetch error:', profileError.message);
    }

    console.log('👤 Profile:', profile);

    res.status(200).json({ 
        session: data.session,
        user: {
            id: data.user.id,
            role: profile?.role || 'nxenes',
            department: profile?.department || null,
            full_name: profile?.full_name || data.user.user_metadata?.fullName || ''
        }
    });
});

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email-i është i detyrueshëm!" });

    // Dërgo kërkesën tek Supabase për të gjeneruar emailin e resetimit
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5173/reset-password'
    });

    // Log për debug: tregon nëse Supabase kthen ndonjë gabim ose info
    console.log('🔔 resetPasswordForEmail result:', { email, data, error });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "✅ Linku i resetimit u dërgua! Kontrollo email-in tënd.", data });
});

// Test endpoint: dërgon të njëjtin email resetim dhe kthen përgjigjen e supabase
app.post('/api/test-send-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email-i është i detyrueshëm!' });

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5173/reset-password'
    });

    console.log('🧪 test-send-reset:', { email, data, error });

    if (error) return res.status(400).json({ error: error.message, raw: error });
    res.status(200).json({ message: 'Test email sent (Supabase response)', data });
});

app.post('/api/reset-password', async (req, res) => {
    const { newPassword, accessToken } = req.body;
    if (!newPassword || !accessToken) return res.status(400).json({ error: "Të dhëna të pakompletuara!" });

    try {
        // Retrieve the user using their access token
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(400).json({ error: "Linku ka skaduar ose është i pavlefshëm!" });
        }

        // Use the admin API (service role) to update their password securely
        // NOTE: ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ message: "✅ Fjalëkalimi u ndryshua me sukses!" });
    } catch (err) {
        console.error("Reset error:", err);
        res.status(500).json({ error: "Gabim i brendshëm i serverit." });
    }
});

// Alias për ResetPassword.tsx që dërgon tek /api/update-password
app.post('/api/update-password', async (req, res) => {
    const { new_password, access_token } = req.body;
    if (!new_password || !access_token) return res.status(400).json({ error: "Të dhëna të pakompletuara!" });

    try {
        // First, get the user id from the provided access token
        const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
        if (userError || !user) return res.status(400).json({ error: "Token-i ka skaduar ose është i pavlefshëm!" });

        // Use the admin client to update password by user id
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: new_password });
        if (error) return res.status(400).json({ error: error.message });

        res.status(200).json({ message: "✅ Fjalëkalimi u ndryshua me sukses!" });
    } catch (err) {
        console.error('❌ update-password error:', err);
        res.status(500).json({ error: 'Gabim i brendshëm i serverit.' });
    }
});


// --- USER MANAGEMENT ---

app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({ error: "ID e pavlefshme" });
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

app.get('/api/users', async (req, res) => {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

app.put('/api/update-user-role', async (req, res) => {
    const { userId, role, department } = req.body;
    const { error } = await supabase.from('profiles').update({ role, department }).eq('id', userId);
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Përditësimi u krye!" });
});

// --- STUDENT LOGIC ---

app.post('/api/generate-ticket', async (req, res) => {
    const { studentName, counterName } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Kontrollojmë nëse dita ka ndryshuar që nga reseti i fundit
        const lastResetDate = await redisClient.get('last_reset_date');
        
        if (lastResetDate !== today) {
            console.log(`🔄 Dita ka ndryshuar (${lastResetDate} -> ${today}). Duke resetuar radhën...`);
            await resetQueueSystem();
        }

        const ticketNum = await redisClient.incr(`ticket_count:${counterName}`);
        const ticketId = `${counterName.charAt(0).toUpperCase()}-${ticketNum}`;

        const studentData = {
            id: Date.now().toString(),
            studentName,
            ticketNumber: ticketId,
            timestamp: new Date().toISOString()
        };

        await redisClient.rPush(`queue:${counterName}`, JSON.stringify(studentData));
        res.status(200).json(studentData);
    } catch (err) {
        console.error('❌ Gabim në gjenerimin e biletës:', err);
        res.status(500).json({ error: "Dështoi gjenerimi i biletës" });
    }
});

app.post('/api/cancel-ticket', async (req, res) => {
    const { ticketNumber, counterName, studentName } = req.body;
    try {
        // Marrim të gjitha elementet e radhës
        const queue = await redisClient.lRange(`queue:${counterName}`, 0, -1);
        
        let foundStudent = null;
        // Gjejmë dhe heqim biletin e saktë
        for (const item of queue) {
            const parsed = JSON.parse(item);
            if (parsed.ticketNumber === ticketNumber) {
                foundStudent = parsed;
                await redisClient.lRem(`queue:${counterName}`, 1, item);
                break;
            }
        }

        // Ruajmë në histori me statusin 'cancelled'
        const historyData = {
            student_name: foundStudent?.studentName || studentName || 'Nxënës',
            ticket_number: ticketNumber,
            counter_name: counterName,
            status: 'cancelled',
            completed_at: new Date()
        };

        const { error } = await supabase.from('history').insert([historyData]);
        if (error) {
            console.error('⚠️ Gabim në ruajtjen e anulimit në histori:', error.message);
            // Nëse kolona status mungon, provojmë pa të
            if (error.message.toLowerCase().includes('status') || error.code === '42703') {
                const { status: _, ...basicData } = historyData;
                await supabase.from('history').insert([basicData]);
            }
        }

        res.status(200).json({ message: "Bileta u anulua!" });
    } catch (err) {
        console.error('❌ Gabim gjatë anulimit:', err);
        res.status(500).json({ error: "Gabim gjatë anulimit" });
    }
});


// --- QUEUE LOGIC (STAFF ACTIONS) ---

app.get('/api/queue-status/:counterName', async (req, res) => {
    const { counterName } = req.params;
    try {
        const count = await redisClient.lLen(`queue:${counterName}`);
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json({ error: "Gabim në Redis" });
    }
});

app.post('/api/call-next', async (req, res) => {
    const { counterName } = req.body;
    try {
        const studentData = await redisClient.lPop(`queue:${counterName}`);
        if (!studentData) return res.status(200).json({ student: null });
        
        await redisClient.set(`current:${counterName}`, studentData);
        res.status(200).json({ student: JSON.parse(studentData) });
    } catch (err) {
        res.status(500).json({ error: "Gabim gjatë thirrjes" });
    }
});

app.post('/api/finish-student', async (req, res) => {
    try {
        const { studentName, ticketNumber, counterName, status } = req.body;
        console.log('📬 Finish attempt:', { studentName, ticketNumber, counterName, status });

        if (!studentName || !ticketNumber || !counterName) {
            console.error('❌ Mungojnë të dhënat e detyrueshme');
            return res.status(400).json({ error: "Të dhëna të pakompletuara" });
        }
        
        // Të dhënat për insertim
        const historyData = { 
            student_name: studentName, 
            ticket_number: ticketNumber, 
            counter_name: counterName,
            status: status || 'completed',
            completed_at: new Date() 
        };

        // Përpiqemi të insertojmë me status
        const { error } = await supabase.from('history').insert([historyData]);

        if (error) {
            console.error('❌ Supabase Error (Attempt 1):', error.message, error.details, error.hint);
            
            // Nëse gabimi thotë që kolona 'status' nuk ekziston ose nuk u gjet në schema cache, provojmë pa të
            const isStatusError = error.message.toLowerCase().includes('status') || 
                                error.message.toLowerCase().includes('schema cache') || 
                                error.code === '42703';

            if (isStatusError) {
                console.log('⚠️ Kolona "status" mungon në DB. Duke dërguar pa të...');
                const { status: _, ...basicData } = historyData; // Heqim statusin
                const { error: retryError } = await supabase.from('history').insert([basicData]);
                
                if (retryError) {
                    console.error('❌ Supabase Error (Retry):', retryError.message);
                    return res.status(400).json({ error: retryError.message });
                }
            } else {
                return res.status(400).json({ error: error.message });
            }
        }
        
        // Fshijmë studentin aktual nga Redis
        try {
            await redisClient.del(`current:${counterName}`);
        } catch (redisErr) {
            console.error('❌ Gabim në fshirjen nga Redis:', redisErr.message);
            // Vazhdojmë gjithsesi sepse në DB u ruajt
        }

        res.status(200).json({ message: "U arkivua!" });
    } catch (err) {
        console.error('❌ Gabim i papritur:', err.message);
        res.status(500).json({ error: "Gabim serveri" });
    }
});

// --- PUBLIC DISPLAY ENDPOINT ---
app.get('/api/public-display', async (req, res) => {
    try {
        const { data: counters, error } = await supabase.from('counters').select('*').order('name');
        if (error) return res.status(400).json({ error: error.message });

        let displayData = [];
        for (let counter of counters) {
            const currentData = await redisClient.get(`current:${counter.name}`);
            displayData.push({
                counterName: counter.name,
                currentStudent: currentData ? JSON.parse(currentData) : null
            });
        }
        res.status(200).json(displayData);
    } catch (err) {
        res.status(500).json({ error: "Gabim serveri" });
    }
});

// --- ADMIN MONITORING & COUNTERS ---

app.get('/api/counters', async (req, res) => {
    const { data, error } = await supabase.from('counters').select('*').order('name');
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

// --- DEBUG / MANUAL ACTIONS ---
// Endpoint to trigger the reset immediately (useful for testing or manual correction)
app.post('/api/reset-now', async (req, res) => {
    try {
        await resetQueueSystem();
        res.status(200).json({ message: '✅ Reset u krye me sukses.' });
    } catch (err) {
        console.error('❌ Manual reset failed:', err);
        res.status(500).json({ error: 'Dështoi reseti manual.' });
    }
});

app.get('/api/debug-history', async (req, res) => {
    const { data, error } = await supabase.from('history').select('*').order('completed_at', { ascending: false }).limit(5);
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

// Debug endpoint to inspect Redis keys and counts
app.get('/api/debug-redis', async (req, res) => {
    try {
        const allKeys = await redisClient.keys('*');
        const queues = allKeys.filter(k => k.startsWith('queue:'));
        const ticketCounts = allKeys.filter(k => k.startsWith('ticket_count:'));
        const currents = allKeys.filter(k => k.startsWith('current:'));

        const ticketValues = {};
        for (const k of ticketCounts) {
            ticketValues[k] = await redisClient.get(k);
        }

        res.status(200).json({ allKeysCount: allKeys.length, queues, ticketCounts, ticketValues, currents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/queue/:counterName', async (req, res) => {
    const { counterName } = req.params;
    try {
        const queue = await redisClient.lRange(`queue:${counterName}`, 0, -1);
        res.status(200).json(queue.map(item => JSON.parse(item)));
    } catch (err) {
        res.status(500).json({ error: "Gabim në Redis" });
    }
});

app.get('/api/history', async (req, res) => {
    const { date } = req.query; 
    const { data, error } = await supabase
        .from('history')
        .select('*')
        .gte('completed_at', `${date}T00:00:00`)
        .lte('completed_at', `${date}T23:59:59`)
        .order('completed_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
});

// Endpoint për të kontrolluar statusin e një biletë specifike (për studentët)
app.get('/api/ticket-status/:ticketNumber', async (req, res) => {
    const { ticketNumber } = req.params;
    try {
        const { data, error } = await supabase
            .from('history')
            .select('status')
            .eq('ticket_number', ticketNumber)
            .order('completed_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return res.status(404).json({ error: "Bileta nuk u gjend në histori" });
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Gabim serveri" });
    }
});

app.post('/api/counters', async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('counters').insert([{ name }]).select();
    if (error) return res.status(400).json({ error: error.message });
    
    await redisClient.set(`ticket_count:${name}`, 0);
    res.status(200).json({ message: "U shtua!" });
});

app.delete('/api/counters/:id', async (req, res) => {
    const { id } = req.params;
    const { data: counter } = await supabase.from('counters').select('name').eq('id', id).single();
    if (counter) {
        await redisClient.del(`queue:${counter.name}`);
        await redisClient.del(`ticket_count:${counter.name}`);
        await redisClient.del(`current:${counter.name}`);
    }
    await supabase.from('counters').delete().eq('id', id);
    res.status(200).json({ message: "U fshi!" });
});

// --- SERVERI ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveri hapur në portin ${PORT}`);
});

// Debug route list
app.get('/api/_routes', (req, res) => {
    try {
        const routes = [];
        app._router.stack.forEach(mw => {
            if (mw.route && mw.route.path) {
                const methods = Object.keys(mw.route.methods).join(',');
                routes.push({ path: mw.route.path, methods });
            }
        });
        res.status(200).json(routes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});