
export interface WatchlistEntry {
    id: string;
    title: string;
    type: 'Series' | 'Movie';
    seasons?: number;      // For series
    episodes?: number;     // For series - total episodes watched or in series
    length?: string;       // Episode length or movie runtime
    genre: string;
    rating?: string;       // IMDB Rating
    finishedDate?: string; // Date finished watching
    thumbnail?: string;    // Image URL
    status: 'Finished' | 'Watching' | 'Plan to Watch';
    review?: string;       // User review
    createdAt?: string;    // Timestamp
}
