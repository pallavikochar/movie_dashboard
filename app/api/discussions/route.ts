
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase } from '@/app/lib/supabase';

// Primary data file (gitignored — safe from code updates)
const DATA_PATH = path.join(process.cwd(), 'data', 'discussions.json');

// Persistent backup outside the project — survives git operations, rebuilds, etc.
const BACKUP_DIR = path.join(os.homedir(), '.movie-dashboard');
const BACKUP_PATH = path.join(BACKUP_DIR, 'discussions.json');

async function ensureDataFile(filePath: string) {
    try {
        await fs.access(filePath);
    } catch {
        // File doesn't exist — initialize with empty array (never overwrite existing data)
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '[]', 'utf-8');
    }
}

async function readDataFile(filePath: string): Promise<any[]> {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function readLocal(): Promise<any[]> {
    await ensureDataFile(DATA_PATH);
    const primary = await readDataFile(DATA_PATH);

    // If primary is empty, try restoring from backup
    if (primary.length === 0) {
        await ensureDataFile(BACKUP_PATH);
        const backup = await readDataFile(BACKUP_PATH);
        if (backup.length > 0) {
            console.log('[discussions] Primary empty — restoring from backup');
            await atomicWrite(DATA_PATH, backup);
            return backup;
        }
    }
    return primary;
}

async function atomicWrite(filePath: string, data: any[]): Promise<void> {
    // Write to a temp file first, then rename — prevents corruption on crash
    const tmp = filePath + '.tmp';
    const json = JSON.stringify(data, null, 2);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmp, json, 'utf-8');
    await fs.rename(tmp, filePath);
}

async function writeLocal(data: any[]): Promise<void> {
    try {
        // Write primary and backup atomically
        await atomicWrite(DATA_PATH, data);
        await atomicWrite(BACKUP_PATH, data);
    } catch (error) {
        console.error('[discussions] Write error:', error);
    }
}

function isSupabaseConfigured() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key && !url.includes('placeholder') && !key.includes('placeholder');
}

export async function GET() {
    try {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('discussions')
                .select('*')
                .order('timestamp', { ascending: false });
            if (!error && data && data.length > 0) return NextResponse.json(data);
        }

        const localData = await readLocal();
        return NextResponse.json(localData.sort((a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
    } catch (error: any) {
        const localData = await readLocal();
        return NextResponse.json(localData);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const newPost = {
            id: crypto.randomUUID(),
            userName: body.userName,
            userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.userName || Math.random()}`,
            topic: body.topic || 'General Talk',
            content: body.content,
            timestamp: new Date().toISOString(),
            likes: 0
        };

        // 1. Save locally (primary + backup)
        const localData = await readLocal();
        localData.push(newPost);
        await writeLocal(localData);

        // 2. Supabase (optional cloud sync)
        if (isSupabaseConfigured()) {
            await supabase.from('discussions').insert([newPost]);
        }

        return NextResponse.json(newPost);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { id, action } = await req.json();
        const localData = await readLocal();
        const index = localData.findIndex((p: any) => p.id === id);
        let updatedPost = null;

        if (index !== -1) {
            const current = localData[index];
            const newLikes = action === 'unlike' ? Math.max(0, (current.likes || 0) - 1) : (current.likes || 0) + 1;
            updatedPost = { ...current, likes: newLikes };
            localData[index] = updatedPost;
            await writeLocal(localData);
        }

        if (isSupabaseConfigured()) {
            const { data: current } = await supabase
                .from('discussions')
                .select('likes')
                .eq('id', id)
                .single();

            if (current) {
                const newLikes = action === 'unlike' ? Math.max(0, (current.likes || 0) - 1) : (current.likes || 0) + 1;
                const { data: supabaseUpdated } = await supabase
                    .from('discussions')
                    .update({ likes: newLikes })
                    .eq('id', id)
                    .select()
                    .single();
                if (!updatedPost && supabaseUpdated) updatedPost = supabaseUpdated;
            }
        }

        if (!updatedPost) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(updatedPost);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
