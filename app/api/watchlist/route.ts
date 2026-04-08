
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabase } from '@/app/lib/supabase';
import { WatchlistEntry } from '@/app/types';

const DATA_PATH = path.join(process.cwd(), 'data', 'watchlist.json');

// Helper to read local JSON
async function readLocalWatchlist(): Promise<WatchlistEntry[]> {
    try {
        const data = await fs.readFile(DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Local JSON Read Error:', error);
        return [];
    }
}

// Helper to write local JSON
async function writeLocalWatchlist(data: WatchlistEntry[]) {
    try {
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Local JSON Write Error:', error);
    }
}

// Check if Supabase is actually configured (not using placeholders)
function isSupabaseConfigured() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key && !url.includes('placeholder') && !key.includes('placeholder');
}

export async function GET() {
    try {
        // 1. Try Supabase first
        if (isSupabaseConfigured()) {
            const { data: supabaseData, error: supabaseError } = await supabase
                .from('watchlist')
                .select('*')
                .order('createdAt', { ascending: false });

            if (!supabaseError && supabaseData && supabaseData.length > 0) {
                // Supabase is the primary source of truth if it has data
                return NextResponse.json(supabaseData);
            }
        }

        // 2. Fallback to local JSON
        const localData = await readLocalWatchlist();
        // Sort local data to match expected behavior
        const sortedData = [...localData].sort((a, b) => {
            const dateA = a.createdAt || '';
            const dateB = b.createdAt || '';
            return dateB.localeCompare(dateA);
        });

        return NextResponse.json(sortedData);
    } catch (error: any) {
        // Last resort fallback
        const localData = await readLocalWatchlist();
        return NextResponse.json(localData);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const localWatchlist = await readLocalWatchlist();

        // Check if title already exists locally
        if (localWatchlist.some(item => item.title.toLowerCase() === body.title.toLowerCase())) {
            return NextResponse.json({ error: 'This title already exists in your library.' }, { status: 400 });
        }

        const newEntry: WatchlistEntry = {
            id: crypto.randomUUID() as string,
            title: body.title,
            type: body.type,
            seasons: body.seasons || 0,
            episodes: body.episodes || 0,
            length: body.length || '',
            genre: body.genre || '',
            rating: body.rating || '',
            finishedDate: body.finishedDate || '',
            thumbnail: body.thumbnail || '',
            status: body.status || 'Watching',
            review: body.review || '',
            createdAt: new Date().toISOString()
        };

        // 1. Save to Local JSON (Backup)
        localWatchlist.push(newEntry);
        await writeLocalWatchlist(localWatchlist);

        // 2. Save to Supabase (Primary)
        if (isSupabaseConfigured()) {
            await supabase.from('watchlist').insert([newEntry]);
        }

        return NextResponse.json(newEntry);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, updates } = body;

        // 1. Update Local JSON
        const localWatchlist = await readLocalWatchlist();
        const index = localWatchlist.findIndex(item => item.id === id);
        let updatedEntry = null;

        if (index !== -1) {
            updatedEntry = { ...localWatchlist[index], ...updates };
            localWatchlist[index] = updatedEntry;
            await writeLocalWatchlist(localWatchlist);
        }

        // 2. Update Supabase
        if (isSupabaseConfigured()) {
            const { data: supabaseUpdated, error } = await supabase
                .from('watchlist')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            // If local update failed but Supabase succeeded, return Supabase data
            if (!updatedEntry && supabaseUpdated) updatedEntry = supabaseUpdated;
        }

        if (!updatedEntry) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(updatedEntry);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { id } = body;

        // 1. Delete from Local JSON
        const localWatchlist = await readLocalWatchlist();
        const filteredList = localWatchlist.filter(item => item.id !== id);
        const wasDeletedLocally = filteredList.length !== localWatchlist.length;

        if (wasDeletedLocally) {
            await writeLocalWatchlist(filteredList);
        }

        // 2. Delete from Supabase
        let wasDeletedSupabase = false;
        if (isSupabaseConfigured()) {
            const { error } = await supabase
                .from('watchlist')
                .delete()
                .eq('id', id);
            if (!error) wasDeletedSupabase = true;
        }

        if (!wasDeletedLocally && !wasDeletedSupabase) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
