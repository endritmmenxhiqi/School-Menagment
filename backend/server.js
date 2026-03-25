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
    try {
        const keys = await redisClient.keys('*');
        const queueKeys = keys.filter(k => k.startsWith('queue:') || k.startsWith('ticket_count:'));
        
        if (queueKeys.length > 0) {
            await redisClient.del(queueKeys);
            console.log(`🧹 [${new Date().toLocaleString()}] Sistemi u resetua: Radhët filluan nga 0.`);
        } else {
            console.log(`✅ [${new Date().toLocaleString()}] Sistemi është i pastër, nuk kishte të dhëna për të fshirë.`);
        }
    } catch (err) {
        console.error('❌ Gabim gjatë resetimit:', err);
    }
};

(async () => {
    try {
        await redisClient.connect();
        console.log('🚀 Redis Cloud: I lidhur me sukses!');
        
        // Resetojmë sistemin kur ndizet serveri për herë të parë
        await resetQueueSystem();
    } catch (err) {
        console.error('❌ Nuk u lidh me Redis Cloud:', err);
    }
})();

// --- 3. ORARI AUTOMATIK (CRON JOB) ---
// Ky kod ekzekutohet saktësisht në ora 00:00:01 çdo natë
cron.schedule('1 0 0 * * *', () => {
    console.log('⏰ Mesnata! Duke pastruar radhët për ditën e re...');
    resetQueueSystem();
});

// --- 4. MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// --- AUTH ROUTES ---

app.post('/api/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { fullName } }
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Llogaria u krijua!", data });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, department, full_name')
        .eq('id', data.user.id)
        .single();

    res.status(200).json({ 
        session: data.session,
        user: {
            id: data.user.id,
            role: profile?.role || 'nxenes',
            department: profile?.department || null,
            full_name: profile?.full_name
        }
    });
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
    try {
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
        res.status(500).json({ error: "Dështoi gjenerimi i biletës" });
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
        res.status(200).json({ student: JSON.parse(studentData) });
    } catch (err) {
        res.status(500).json({ error: "Gabim gjatë thirrjes" });
    }
});

app.post('/api/finish-student', async (req, res) => {
    const { studentName, ticketNumber, counterName } = req.body;
    const { error } = await supabase.from('history').insert([
        { 
            student_name: studentName, 
            ticket_number: ticketNumber, 
            counter_name: counterName,
            completed_at: new Date() 
        }
    ]);
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "U arkivua!" });
});

// --- ADMIN MONITORING & COUNTERS ---

app.get('/api/counters', async (req, res) => {
    const { data, error } = await supabase.from('counters').select('*').order('name');
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
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
    }
    await supabase.from('counters').delete().eq('id', id);
    res.status(200).json({ message: "U fshi!" });
});

// --- SERVERI ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveri hapur në portin ${PORT}`);
});