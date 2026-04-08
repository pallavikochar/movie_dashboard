
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('title');
    const typeFilter = searchParams.get('type');
    const getList = searchParams.get('list');
    const imdbIdParam = searchParams.get('imdbId');

    if (!query && !imdbIdParam) {
        return NextResponse.json({ error: 'Title or imdbId is required' }, { status: 400 });
    }

    try {
        let imdbId = imdbIdParam;
        let firstResult: any = null;

        if (!imdbId) {
            // Stage 1: Use IMDB Suggestion API (faster and more reliable than scraping search page)
            const suggestionUrl = `https://v3.sg.media-imdb.com/suggestion/f/${encodeURIComponent(query!).toLowerCase()}.json`;
            const suggestionResponse = await axios.get(suggestionUrl, { headers: { 'User-Agent': USER_AGENT } });

            const results = suggestionResponse.data.d || [];
            // Filter results that looks like a movie or tv series (id starts with tt)
            // and optionally matches the requested type filter
            const filteredResults = results.filter((r: any) => {
                if (!r.id || !r.id.startsWith('tt')) return false;

                if (typeFilter) {
                    const isResultSeries = r.q && (r.q.toLowerCase().includes('series') || r.q.toLowerCase().includes('tv'));
                    if (typeFilter === 'Series' && !isResultSeries) {
                        return false;
                    }
                    if (typeFilter === 'Movie' && isResultSeries) {
                        return false;
                    }
                }
                return true;
            });

            if (getList === 'true') {
                return NextResponse.json({ results: filteredResults });
            }

            firstResult = filteredResults[0];

            if (!firstResult) {
                return NextResponse.json({ error: 'No results found' }, { status: 404 });
            }

            imdbId = firstResult.id;
        }

        if (!firstResult) {
            firstResult = { id: imdbId }; // Dummy placeholder if we went straight to ID
        }

        const detailsUrl = `https://www.imdb.com/title/${imdbId}/`;

        // Stage 2: Scrape the details page
        const detailsResponse = await axios.get(detailsUrl, {
            headers: HEADERS,
            decompress: true,
            timeout: 10000
        });
        const $ = cheerio.load(detailsResponse.data);

        // Try to extract JSON-LD data (usually very robust if present)
        let ldData: any = {};
        try {
            $('script[type="application/ld+json"]').each((i, el) => {
                const content = $(el).html();
                if (content && content.includes('"@type":')) {
                    const parsed = JSON.parse(content);
                    if (parsed['@type'] === 'TVSeries' || parsed['@type'] === 'Movie') {
                        ldData = parsed;
                    }
                }
            });
        } catch (e) {
            console.error('JSON-LD parse error');
        }

        // Extract High-Fidelity Data from __NEXT_DATA__ (IMDB's React hydration source)
        let nextData: any = {};
        try {
            const jsonText = $('#__NEXT_DATA__').html();
            if (jsonText) {
                nextData = JSON.parse(jsonText);
            }
        } catch (e) {
            console.error('__NEXT_DATA__ parse error');
        }

        const pageProps = nextData.props?.pageProps;
        const mainData = pageProps?.aboveTheFoldData;

        // 1. Initial State from Suggestion API & JSON-LD
        let title = mainData?.titleText?.text || ldData.name || firstResult.l || '';
        
        let rating = mainData?.ratingsSummary?.aggregateRating?.toString() || 
                     ldData.aggregateRating?.ratingValue?.toString() || '';

        // Robust Cheerio Fill-in if JSON paths fail
        if (!rating) {
            rating = $('[data-testid="hero-rating-bar__aggregate-rating__score"] span').first().text().trim() ||
                     $('.sc-bde20123-1.iZwwNf').first().text().trim() ||
                     $('.ipc-btn__text span').first().text().trim().match(/^\d\.\d$/)?.[0] || '';
        }
        
        let poster = mainData?.primaryImage?.url || ldData.image || firstResult.i?.imageUrl || '';
        let plot = mainData?.plot?.plotText?.plainText || ldData.description || '';
        let genres: string[] = [];

        if (mainData?.genres?.genres) {
            genres = mainData.genres.genres.map((g: any) => g.text);
        } else if (ldData.genre) {
            genres = Array.isArray(ldData.genre) ? ldData.genre : [ldData.genre];
        }

        const titleType = mainData?.titleType?.text || firstResult.q || '';
        const isSeries = titleType.toLowerCase().includes('series') ||
            titleType.toLowerCase().includes('tv') ||
            firstResult.qid?.toLowerCase().includes('tv');

        const releaseYear = mainData?.releaseYear?.year || firstResult.y || '';
        let runtime = mainData?.runtime?.displayableProperty?.value?.plainText || '';
        
        // Refined Runtime Extraction for Sitcoms
        if (!runtime || runtime.includes('h')) {
             $('[data-testid="hero-title-block__metadata"] li').each((i, el) => {
                const text = $(el).text().trim();
                // If we see something like "22m" in the metadata list, it's usually the real episode length
                if (text.match(/^\d+m$/)) {
                    runtime = text;
                }
            });
        }

        let seasons = 0;
        let episodes = 0;

        // 2. Series Metadata Boost: Try TVMaze for superior accuracy
        if (isSeries) {
            try {
                // TVMaze API is extremely reliable for series-specific counts
                const tvMazeRes = await axios.get(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}&embed=episodes`, { timeout: 5000 });
                if (tvMazeRes.data) {
                    const tvData = tvMazeRes.data;
                    // Only update if TVMaze data is valid
                    title = tvData.name || title;
                    if (tvData.rating?.average && !rating) rating = tvData.rating.average.toString();
                    if (tvData.summary && !plot) {
                        const cleanPlot = tvData.summary.replace(/<[^>]*>/g, '').trim();
                        if (cleanPlot.length > 10) plot = cleanPlot;
                    }
                    if (tvData.genres && tvData.genres.length > 0 && genres.length === 0) genres = tvData.genres;
                    if ((tvData.image?.original || tvData.image?.medium) && !poster) poster = tvData.image.original || tvData.image.medium;
                    
                    // TVMaze averageRuntime is usually the most accurate for sitcoms (e.g., 22m)
                    if (tvData.averageRuntime) runtime = `${tvData.averageRuntime}m`;
                    else if (tvData.runtime && !runtime) runtime = `${tvData.runtime}m`;
 
                    if (tvData._embedded?.episodes) {
                        const eps = tvData._embedded.episodes;
                        episodes = eps.length;
                        const sSet = new Set(eps.map((e: any) => e.season));
                        seasons = sSet.size;
                    }
                }
            } catch (tvError) {
                console.warn('TVMaze fetch failed, using IMDB fallback');
                const epInfo = pageProps?.mainColumnData?.episodes;
                if (epInfo) {
                    seasons = epInfo.seasons?.length || 0;
                    episodes = epInfo.episodes?.total || 0;
                }
                if (seasons === 0) seasons = ldData.numberOfSeasons || 0;
                if (episodes === 0) episodes = ldData.numberOfEpisodes || 0;
            }
        }

        // 3. Fallbacks for Movies & Missing Data
        if (!rating) {
            rating = $('[data-testid="hero-rating-bar__aggregate-rating__score"] span').first().text().trim();
        }

        if (!runtime) {
            // Scrape runtime from metadata list
            $('[data-testid="hero-title-block__metadata"] li').each((i, el) => {
                const text = $(el).text().trim();
                if (text.match(/\d+h/) || text.match(/\d+m/)) {
                    runtime = text;
                }
            });
        }

        if (!plot && firstResult.s) {
            plot = `Cast: ${firstResult.s}`;
        }

        if (genres.length === 0) {
            $('[data-testid="genres"] .ipc-chip__text').each((i, el) => {
                genres.push($(el).text().trim());
            });
        }

        return NextResponse.json({
            title: title || '',
            rating,
            poster,
            plot,
            genres: genres.join(', '),
            runtime,
            type: typeFilter || (isSeries ? 'Series' : 'Movie'),
            seasons: isSeries ? (seasons || 1) : 0,
            episodes: isSeries ? (episodes || 0) : 0,
            imdbUrl: detailsUrl
        });

    } catch (error: any) {
        console.error('Scraping failed:', error.message);
        return NextResponse.json({ error: 'Failed to fetch data from IMDB' }, { status: 500 });
    }
}
