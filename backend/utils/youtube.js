// backend/utils/youtube.js
// Helper utilities for interacting with YouTube Data API v3 and transcript extraction.

import axios from "axios";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Helper to convert ISO 8601 duration (PT1H2M30S) to seconds
function isoDurationToSeconds(iso) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = iso.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideoDetails(videoId) {
  if (!videoId) throw new Error("Missing videoId");

  // Attempt YouTube Data API if key is available
  if (YOUTUBE_API_KEY) {
    try {
      const url = `${YOUTUBE_API_BASE}/videos`;
      const params = {
        part: "snippet,contentDetails,statistics",
        id: videoId,
        key: YOUTUBE_API_KEY,
      };
      const { data } = await axios.get(url, { params });
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const { title, description, channelTitle, thumbnails, tags, publishedAt, categoryId } = item.snippet;
        const duration = isoDurationToSeconds(item.contentDetails.duration);
        return {
          videoId,
          title,
          description,
          channelTitle,
          thumbnail: thumbnails?.high?.url || thumbnails?.default?.url || "",
          duration,
          publishedAt,
          categoryId,
          tags: tags || [],
        };
      }
    } catch (err) {
      console.warn("YouTube API request failed (falling back to noembed):", err.message);
    }
  }

  // Fallback to noembed.com if API key is invalid/missing or returns 403
  try {
    const { data } = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (data && data.title) {
      return {
        videoId,
        title: data.title || "",
        description: "",
        channelTitle: data.author_name || "",
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0,
        tags: [],
      };
    }
  } catch (noembedErr) {
    console.warn("noembed fallback failed:", noembedErr.message);
  }

  // Last-resort fallback metadata
  return {
    videoId,
    title: `YouTube Video (${videoId})`,
    description: "",
    channelTitle: "YouTube",
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
    tags: [],
  };
}

export async function fetchPlaylistItems(playlistId) {
  if (!playlistId) return { playlistId, playlistTitle: "", items: [] };

  if (YOUTUBE_API_KEY) {
    try {
      const items = [];
      let nextPageToken = "";
      do {
        const { data } = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: "snippet,contentDetails",
            playlistId,
            maxResults: 50,
            pageToken: nextPageToken,
            key: YOUTUBE_API_KEY,
          },
        });
        data.items.forEach((it) => {
          const { title, thumbnails } = it.snippet;
          const videoId = it.contentDetails.videoId;
          items.push({ videoId, title, thumbnail: thumbnails?.high?.url || thumbnails?.default?.url || "" });
        });
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      // Fetch playlist title
      const { data: plData } = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
        params: { part: "snippet", id: playlistId, key: YOUTUBE_API_KEY },
      });
      const playlistTitle = plData.items?.[0]?.snippet?.title || "";
      return { playlistId, playlistTitle, items };
    } catch (err) {
      console.warn("Playlist API failed:", err.message);
    }
  }

  // Fallback: Public YouTube Playlist RSS Feed
  try {
    const { data: xml } = await axios.get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
    if (xml) {
      const items = [];
      const titleMatch = xml.match(/<title>(.*?)<\/title>/);
      const playlistTitle = titleMatch ? titleMatch[1] : "";

      const entries = xml.split("<entry>");
      entries.shift();
      for (const entry of entries) {
        const vidMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
        const tMatch = entry.match(/<title>(.*?)<\/title>/);
        const thumbMatch = entry.match(/media:thumbnail url="(.*?)"/);
        if (vidMatch && vidMatch[1]) {
          const videoId = vidMatch[1];
          const title = tMatch ? tMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
          const thumbnail = thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          items.push({ videoId, title, thumbnail });
        }
      }
      if (items.length > 0) {
        return { playlistId, playlistTitle, items };
      }
    }
  } catch (rssErr) {
    console.warn("Playlist RSS fallback failed:", rssErr.message);
  }

  return { playlistId, playlistTitle: "", items: [] };
}

// Preserved and expanded keyword list for high recall study detection
const STUDY_KEYWORDS = [
  // Preserved original keywords
  "study",
  "lecture",
  "tutorial",
  "programming",
  "coding",
  "algorithm",
  "data structures",
  "computer networks",
  "operating systems",
  "math",
  "science",
  "exam",
  "java",
  "react",
  "python",
  "ds",
  "algo",
  // Expanded educational & placement keywords
  "aptitude",
  "placement",
  "nqt",
  "tcs",
  "reasoning",
  "verbal",
  "quantitative",
  "interview",
  "preparation",
  "course",
  "learn",
  "learning",
  "solution",
  "questions",
  "gate",
  "jee",
  "neet",
  "dbms",
  "sql",
  "engineering",
  "class",
  "chapter",
  "guide",
  "computer",
  "system",
  "development",
  "web",
  "cpp",
  "c++",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "civics",
  "economics",
  "revision",
  "notes",
  "crash course",
  "one shot",
  "syllabus",
  "paper",
  "mock",
  "solved",
];

const NON_STUDY_KEYWORDS = [
  "official music video",
  "official video",
  "full movie",
  "movie trailer",
  "lyric video",
  "remix song",
  "entertainment vlog",
  "funny prank",
  "bhajan",
  "bhakti",
  "kirtan",
  "aarti",
  "chalisa",
  "mantra",
  "geeta path",
  "devotional",
  "stotra",
  "pravachan",
  "satsang",
  "shyam baba",
  "krishna bhajan",
  "ram bhajan",
  "shiv bhajan",
  "comedy",
  "funny",
  "standup",
  "stand-up",
  "roast",
  "prank",
  "jokes",
  "mimicry",
  "lallantop comedy",
  "kapil sharma",
  "chotu dada",
  "movie",
  "film",
  "teaser",
  "cinema",
  "scene",
  "climax",
  "full movie hindi",
  "south movie",
  "song",
  "music",
  "singing",
  "dance",
  "dj",
  "remix",
  "lyrics",
  "album song",
  "punjabi song",
  "bhojpuri",
  "bollywood",
  "gaming",
  "gameplay",
  "gta",
  "gta5",
  "minecraft",
  "bgmi",
  "pubg",
  "freefire",
  "valorant",
  "techno gamerz",
  "vlog",
  "daily vlog",
  "family vlog",
  "lifestyle vlog",
  "travel vlog",
  "sourav joshi",
  "serial",
  "drama",
  "episode",
  "natak",
  "tarak mehta",
  "tmkoc"
];

export function evaluateStudyVideo({ title = "", description = "", tags = [], categoryId = "" }) {
  const content = `${title.toLowerCase()} ${description.toLowerCase()} ${tags.join(" ").toLowerCase()} ${categoryId.toLowerCase()}`;
  const isExplicitNonStudy = NON_STUDY_KEYWORDS.some((kw) => content.includes(kw.toLowerCase()));
  if (isExplicitNonStudy) {
    return { isStudyVideo: false, studyScore: 0 };
  }

  const matches = STUDY_KEYWORDS.filter((kw) => content.includes(kw.toLowerCase()));
  const matchCount = matches.length;
  const studyScore = matchCount === 0 ? 0 : Math.min(100, Math.round((matchCount / 3) * 100));

  const isStudyVideo = matchCount > 0;

  return { isStudyVideo, studyScore };
}
