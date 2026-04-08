
# WatchHistory - Movie & Series Dashboard

A personal dashboard to track movies and TV series you've watched or plan to watch. Features automatic metadata fetching from IMDB and a beautiful, modern UI.

## Features

- **Dynamic Tracking**: Add movies and series with ease.
- **Auto-Fetching**: Enter a title and let the app scrape details (Seasons, Episodes, Runtime, Genre, Rating, Poster) from IMDB.
- **Manual Entry**: Edit details manually if needed.
- **Visual Dashboard**: Glassmorphism design with responsive grid layout.
- **Status Tracking**: Mark items as "Watching", "Finished", or "Plan to Watch".
- **Local Data**: Your data is stored locally in `data/watchlist.json` for privacy and simplicity.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open in Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000).

## Usage

- Click **"Add New"** to open the modal.
- Type a movie/series name in the search bar and press **Enter** or click **Fetch Info**.
- Review the fetched details (poster, seasons, etc.) and click **Save Entry**.
- Use the filters at the top to view specific categories (e.g., "Watching", "Movies").
- Click **Mark Finished** on a card to update its status.
- Delete items via the delete button on the card.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **Icons**: Lucide React
- **Backend**: Next.js API Routes
- **Data**: Local JSON file
- **Scraping**: Cheerio + Axios

## Note

The scraping feature relies on IMDB's structure. If fetched data is incomplete, you can manually edit the fields in the "Add New" modal.
