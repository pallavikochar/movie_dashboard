
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabase } from '@/app/lib/supabase';

const DATA_PATH = path.join(process.cwd(), 'data', 'discussions.json');

async function readLocal() {
    try {
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function writeLocal(data: any) {
    try {
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Local JSON Write Error:', error);
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

        // 1. Local
        const localData = await readLocal();
        localData.push(newPost);
        await writeLocal(localData);

        // 2. Supabase
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
