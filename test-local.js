const { execSync } = require('child_process');
const axios = require('axios');

const formatRuntime = (minutesStr) => {
    if (!minutesStr) return '';
    const strVal = String(minutesStr);
    if (strVal.includes('h')) return strVal;
    const mins = parseInt(strVal.replace(/[^0-9]/g, ''));
    if (isNaN(mins) || mins === 0) return '';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

async function run() {
    try {
        const res = await axios.get('http://localhost:3000/api/scrape?imdbId=tt10608792');
        console.log("Locally Scraped Runtime:", res.data.runtime);
        console.log("Formatted:", formatRuntime(res.data.runtime));
    } catch(e) {
        console.log("Local scrape failed");
    }

    try {
       const key = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
       const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/739116?api_key=${key}`);
       const tmdbRuntime = `${tmdbRes.data.runtime}m`;
       console.log("TMDB Runtime string:", tmdbRuntime);
       console.log("Formatted:", formatRuntime(tmdbRuntime));
    } catch(e) {
       console.log("TMDB failed");
    }
}
run();
