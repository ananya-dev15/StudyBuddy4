// backend/utils/youtube.js
// Helper utilities for interacting with YouTube Data API v3 and transcript extraction.

import axios from "axios";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const getApiKey = () => process.env.YOUTUBE_API_KEY;

// In-memory cache for search results to respect YouTube quota limits
const searchCache = new Map();
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL
const MAX_CACHE_ENTRIES = 200;

function getCachedSearchResults(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedSearchResults(key, data) {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { timestamp: Date.now(), data });
}

// Decode common HTML entities in titles and descriptions returned by YouTube
export function decodeHtmlEntities(str = "") {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Format seconds to hh:mm:ss or mm:ss
export function formatSecondsToDuration(seconds) {
  const total = Math.max(0, parseInt(seconds, 10) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const sStr = String(secs).padStart(2, "0");
  if (hours > 0) {
    const mStr = String(minutes).padStart(2, "0");
    return `${hours}:${mStr}:${sStr}`;
  }
  return `${minutes}:${sStr}`;
}

// Helper to convert ISO 8601 duration (PT1H2M30S) to seconds
export function isoDurationToSeconds(iso) {
  if (!iso) return 0;
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

  const apiKey = getApiKey();
  // Attempt YouTube Data API if key is available
  if (apiKey) {
    try {
      const url = `${YOUTUBE_API_BASE}/videos`;
      const params = {
        part: "snippet,contentDetails,statistics",
        id: videoId,
        key: apiKey,
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

const playlistCache = new Map();
const PLAYLIST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export async function fetchPlaylistItems(playlistId) {
  if (!playlistId) return { playlistId, playlistTitle: "", items: [] };

  const cached = playlistCache.get(playlistId);
  if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const items = [];
      let nextPageToken = "";
      let pageCount = 0;
      do {
        const { data } = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: "snippet,contentDetails",
            playlistId,
            maxResults: 50,
            pageToken: nextPageToken || undefined,
            key: apiKey,
          },
        });
        (data.items || []).forEach((it) => {
          const { title, thumbnails } = it.snippet || {};
          const videoId = it.contentDetails?.videoId;
          if (videoId) {
            items.push({
              videoId,
              title: decodeHtmlEntities(title || ""),
              thumbnail:
                thumbnails?.high?.url ||
                thumbnails?.medium?.url ||
                thumbnails?.default?.url ||
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            });
          }
        });
        nextPageToken = data.nextPageToken;
        pageCount++;
      } while (nextPageToken && pageCount < 2); // Safely fetch up to 100 videos

      // Fetch playlist title
      let playlistTitle = "";
      let channelTitle = "";
      try {
        const { data: plData } = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
          params: { part: "snippet", id: playlistId, key: apiKey },
        });
        playlistTitle = decodeHtmlEntities(plData.items?.[0]?.snippet?.title || "");
        channelTitle = decodeHtmlEntities(plData.items?.[0]?.snippet?.channelTitle || "");
      } catch (plErr) {
        // Title fetch failure is non-fatal
      }

      const result = { playlistId, playlistTitle, channelTitle, items };
      playlistCache.set(playlistId, { timestamp: Date.now(), data: result });
      return result;
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

/**
 * Search YouTube videos using YouTube Data API v3 search.list endpoint.
 * Includes caching, batch duration lookup, and graceful error handling.
 */
export async function searchYouTubeVideos({ query, pageToken = "", maxResults = 10 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error(
      "YouTube API key is not configured on the server. Please set YOUTUBE_API_KEY in backend/.env"
    );
    err.code = "NO_API_KEY";
    err.status = 500;
    throw err;
  }

  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    const err = new Error("Search query cannot be empty.");
    err.status = 400;
    throw err;
  }

  const limit = Math.min(Math.max(parseInt(maxResults, 10) || 10, 1), 25);
  const cacheKey = `${cleanQuery.toLowerCase()}::${pageToken || ""}::${limit}`;
  const cached = getCachedSearchResults(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  try {
    const searchRes = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: "snippet",
        type: "video,playlist",
        q: cleanQuery,
        maxResults: limit,
        pageToken: pageToken || undefined,
        key: apiKey,
      },
    });

    const searchData = searchRes.data || {};
    const rawItems = searchData.items || [];
    const videoIds = [];
    const playlistIds = [];

    rawItems.forEach((it) => {
      if (it.id?.kind === "youtube#playlist" || it.id?.playlistId) {
        const plId = it.id?.playlistId || it.id?.id;
        if (plId) playlistIds.push(plId);
      } else if (it.id?.kind === "youtube#video" || it.id?.videoId) {
        const vid = it.id?.videoId || it.id?.id;
        if (vid) videoIds.push(vid);
      }
    });

    // Fetch video details and playlist metadata in parallel for maximum speed
    const metaMap = {};
    const playlistMetaMap = {};

    const [vidRes, plRes] = await Promise.all([
      videoIds.length > 0
        ? axios.get(`${YOUTUBE_API_BASE}/videos`, {
            params: {
              part: "contentDetails,statistics",
              id: videoIds.join(","),
              key: apiKey,
            },
          }).catch((err) => {
            console.warn("Video metadata batch fetch failed:", err.message);
            return null;
          })
        : Promise.resolve(null),
      playlistIds.length > 0
        ? axios.get(`${YOUTUBE_API_BASE}/playlists`, {
            params: {
              part: "snippet,contentDetails",
              id: playlistIds.join(","),
              key: apiKey,
            },
          }).catch((err) => {
            console.warn("Playlist metadata batch fetch failed:", err.message);
            return null;
          })
        : Promise.resolve(null),
    ]);

    if (vidRes?.data?.items) {
      vidRes.data.items.forEach((v) => {
        const sec = isoDurationToSeconds(v.contentDetails?.duration || "");
        const vCount = parseInt(v.statistics?.viewCount || "0", 10);
        const lCount = parseInt(v.statistics?.likeCount || "0", 10);
        const cCount = parseInt(v.statistics?.commentCount || "0", 10);
        metaMap[v.id] = {
          seconds: sec,
          formatted: formatSecondsToDuration(sec),
          viewCount: vCount,
          likeCount: lCount,
          commentCount: cCount,
          viewsFormatted: formatViewCount(vCount),
        };
      });
    }

    if (plRes?.data?.items) {
      plRes.data.items.forEach((p) => {
        playlistMetaMap[p.id] = {
          itemCount: parseInt(p.contentDetails?.itemCount || "0", 10),
        };
      });
    }

    const videoItems = [];
    const playlistItemsList = [];

    rawItems.forEach((it) => {
      const isPl = it.id?.kind === "youtube#playlist" || Boolean(it.id?.playlistId);
      const snippet = it.snippet || {};

      if (isPl) {
        const plId = it.id?.playlistId || it.id?.id;
        const plMeta = playlistMetaMap[plId] || { itemCount: 0 };
        const itemObj = {
          type: "playlist",
          isPlaylist: true,
          playlistId: plId,
          title: decodeHtmlEntities(snippet.title || ""),
          description: decodeHtmlEntities(snippet.description || ""),
          channelTitle: decodeHtmlEntities(snippet.channelTitle || ""),
          thumbnail:
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/default/hqdefault.jpg`,
          itemCount: plMeta.itemCount,
          publishedAt: snippet.publishedAt,
        };
        const rankData = calculatePlaylistRankScore(itemObj, cleanQuery);
        itemObj.rankScore = rankData.final;
        itemObj.score = rankData.final;
        itemObj.rankDetails = rankData;
        playlistItemsList.push(itemObj);
      } else {
        const vid = it.id?.videoId || it.id?.id;
        const meta = metaMap[vid] || {
          seconds: 0,
          formatted: "",
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          viewsFormatted: "",
        };
        const itemObj = {
          type: "video",
          isPlaylist: false,
          videoId: vid,
          title: decodeHtmlEntities(snippet.title || ""),
          description: decodeHtmlEntities(snippet.description || ""),
          channelTitle: decodeHtmlEntities(snippet.channelTitle || ""),
          thumbnail:
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
          duration: meta.seconds,
          durationFormatted: meta.formatted,
          viewCount: meta.viewCount,
          likeCount: meta.likeCount,
          commentCount: meta.commentCount,
          viewsFormatted: meta.viewsFormatted,
          publishedAt: snippet.publishedAt,
        };

        const rankData = calculateIntelligentRankScore(itemObj, cleanQuery);
        itemObj.rankScore = rankData.final;
        itemObj.score = rankData.final;
        itemObj.rankDetails = rankData;
        videoItems.push(itemObj);
      }
    });

    // 🏆 Sort videos using the multi-factor intelligent ranking with tie-breaking
    videoItems.sort((a, b) => {
      const diff = (b.rankScore || 0) - (a.rankScore || 0);
      if (Math.abs(diff) >= 0.5) return diff;

      const trendingDiff = (b.rankDetails?.trending || 0) - (a.rankDetails?.trending || 0);
      if (Math.abs(trendingDiff) >= 0.5) return trendingDiff;

      const likeRatioA = a.rankDetails?.metrics?.likeRatio || 0;
      const likeRatioB = b.rankDetails?.metrics?.likeRatio || 0;
      if (Math.abs(likeRatioB - likeRatioA) >= 0.001) return likeRatioB - likeRatioA;

      const relDiff = (b.rankDetails?.relevance || 0) - (a.rankDetails?.relevance || 0);
      if (Math.abs(relDiff) >= 0.5) return relDiff;

      const timeA = new Date(a.publishedAt).getTime() || 0;
      const timeB = new Date(b.publishedAt).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;

      return (b.rankDetails?.reliability || 0) - (a.rankDetails?.reliability || 0);
    });

    // Sort playlists by relevance
    playlistItemsList.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));

    // Mark the top video as Best Suggested Video
    if (videoItems.length > 0 && !pageToken) {
      videoItems[0].isBestSuggested = true;
      videoItems[0].suggestedBadge = "Best Suggested Video";
      videoItems[0].suggestedReason = "Recommended based on current popularity, engagement & student reliability";
    }

    // Compose a balanced, high-quality list:
    // Best Suggested Video is ALWAYS #1 at the top of the search results!
    // Videos and playlists are interleaved so students get both top recommendations immediately.
    const items = [];
    const isExplicitPlaylistQuery = cleanQuery.toLowerCase().includes("playlist");

    if (isExplicitPlaylistQuery && playlistItemsList.length > 0) {
      // User explicitly typed "playlist" -> show top playlist first, then videos
      playlistItemsList[0].isBestSuggested = true;
      playlistItemsList[0].suggestedBadge = "Best Suggested Playlist";
      items.push(...playlistItemsList, ...videoItems);
    } else {
      // General topic search -> Top Video is #1 Best Suggested Video!
      let vIdx = 0;
      let pIdx = 0;

      // Always place Best Suggested Video at index 0
      if (videoItems.length > 0) {
        items.push(videoItems[vIdx++]);
      }

      // Interleave remaining items: 2 videos, 1 playlist, 2 videos, 1 playlist...
      while (vIdx < videoItems.length || pIdx < playlistItemsList.length) {
        if (vIdx < videoItems.length) items.push(videoItems[vIdx++]);
        if (pIdx < playlistItemsList.length) items.push(playlistItemsList[pIdx++]);
        if (vIdx < videoItems.length) items.push(videoItems[vIdx++]);
      }
    }

    const result = {
      query: cleanQuery,
      nextPageToken: searchData.nextPageToken || null,
      prevPageToken: searchData.prevPageToken || null,
      totalResults: searchData.pageInfo?.totalResults || items.length,
      items,
    };

    setCachedSearchResults(cacheKey, result);
    return result;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const ytErrors = err.response.data?.error?.errors || [];
      const isQuota =
        status === 403 &&
        (ytErrors.some(
          (e) => e.reason === "quotaExceeded" || e.reason === "dailyLimitExceeded"
        ) ||
          JSON.stringify(err.response.data || "").includes("quotaExceeded"));

      const customErr = new Error(
        isQuota
          ? "YouTube API daily quota exceeded. You can still paste direct video URLs manually."
          : err.response.data?.error?.message || "YouTube API search failed."
      );
      customErr.status = status;
      customErr.quotaExceeded = isQuota;
      throw customErr;
    }
    throw err;
  }
}

/**
 * Format view count into readable short format (e.g. 1.2M views, 450K views)
 */
export function formatViewCount(views) {
  if (!views || isNaN(views)) return "";
  const n = Number(views);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M views";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K views";
  return n + " views";
}

/**
 * Modular ranking weights configuration.
 * Trending > Likes/Engagement > Reliability > Relevance/Recency.
 * Normalized to 1.0 (100%).
 */
export const RANKING_WEIGHTS = {
  trending: 0.45,   // CURRENT TRENDING / RECENT POPULARITY (Highest weight)
  engagement: 0.30, // LIKE ENGAGEMENT (Second highest weight)
  reliability: 0.15,// STUDENT RELIABILITY / QUALITY (Lower weight)
  relevance: 0.10,  // RELEVANCE & RECENCY SUPPORTING FACTORS
};

/**
 * 1. Current Trending / Recent Popularity Score (0 - 100)
 * Evaluates current momentum using views relative to video age (view velocity)
 * and content freshness. Videos that are rapidly gaining views recently receive
 * much higher scores than old videos with large, stagnant lifetime views.
 */
export function calculateTrendingScore(video) {
  const viewCount = Math.max(0, Number(video.viewCount) || 0);
  const publishTime = new Date(video.publishedAt).getTime();
  const now = Date.now();

  // Video age in days (minimum floor of 1 hour to prevent division by zero)
  const ageInMs = isNaN(publishTime)
    ? 365 * 24 * 60 * 60 * 1000
    : Math.max(3600 * 1000, now - publishTime);
  const ageInDays = ageInMs / (24 * 60 * 60 * 1000);

  // View velocity: average views per day since upload
  const viewVelocity = viewCount / ageInDays;

  // Normalized velocity score (0 - 100) using log scaling:
  // 50/day -> ~38, 500/day -> ~61, 5,000/day -> ~84, 25,000+/day -> 95-100
  const velocityScore = Math.min(100, Math.max(0, (Math.log10(viewVelocity + 1) / 4.4) * 100));

  // Freshness factor: penalizes years-old stale videos and prioritizes active fresh tutorials
  let freshnessFactor;
  if (ageInDays <= 14) {
    freshnessFactor = 1.0;  // Past 2 weeks (viral / rapid growth)
  } else if (ageInDays <= 60) {
    freshnessFactor = 0.90; // Past 2 months (very fresh)
  } else if (ageInDays <= 180) {
    freshnessFactor = 0.75; // Past 6 months
  } else if (ageInDays <= 365) {
    freshnessFactor = 0.60; // Past 1 year
  } else if (ageInDays <= 730) {
    freshnessFactor = 0.40; // 1-2 years
  } else if (ageInDays <= 1460) {
    freshnessFactor = 0.25; // 2-4 years
  } else {
    freshnessFactor = 0.15; // 4+ years old
  }

  // 70% velocity + 30% freshness
  const trendingScore = (velocityScore * 0.70) + (freshnessFactor * 100 * 0.30);
  return Math.min(100, Math.max(0, trendingScore));
}

/**
 * 2. Like / Engagement Score (0 - 100)
 * Evaluates like-to-view ratio, comment activity, and relative engagement.
 * Does NOT rank purely on absolute counts so older videos with accumulated likes don't overpower.
 */
export function calculateEngagementScore(video) {
  const viewCount = Math.max(0, Number(video.viewCount) || 0);
  const likeCount = Math.max(0, Number(video.likeCount) || 0);
  const commentCount = Math.max(0, Number(video.commentCount) || 0);

  if (viewCount === 0) return 0;

  // Like-to-view ratio: typical YouTube educational video is ~2-4%, excellent is >= 7-8%
  const likeRatio = likeCount / viewCount;
  const likeRatioScore = Math.min(100, (likeRatio / 0.07) * 100);

  // Comment-to-view ratio: typical is ~0.1-0.3%, high is >= 0.5%
  const commentRatio = commentCount / viewCount;
  const commentRatioScore = Math.min(100, (commentRatio / 0.005) * 100);

  // Social proof verification (logarithmic scaling of total likes, verifying real audience scale)
  const absoluteLikesScore = Math.min(100, (Math.log10(likeCount + 1) / 5) * 100);

  // 60% like ratio + 20% comment ratio + 20% social proof volume
  const engagementScore = (likeRatioScore * 0.60) + (commentRatioScore * 0.20) + (absoluteLikesScore * 0.20);
  return Math.min(100, Math.max(0, engagementScore));
}

/**
 * 3. Student Reliability / Quality Score (0 - 100)
 * Assesses educational depth, optimal study duration, channel credibility,
 * and penalizes short spam, non-study content, or clickbait.
 */
export function calculateStudentReliabilityScore(video, cleanQuery) {
  let score = 50; // Neutral baseline
  const title = String(video.title || "").toLowerCase();
  const desc = String(video.description || "").toLowerCase();
  const channel = String(video.channelTitle || "").toLowerCase();
  const durationSec = Number(video.duration) || 0;

  // A. Educational quality cues in title or description (+20 pts)
  const educationalCues = [
    "tutorial", "course", "full course", "complete", "lecture",
    "explanation", "explained", "crash course", "oneshot", "one shot",
    "roadmap", "learn", "basics", "introduction", "guide", "masterclass",
    "in hindi", "beginner", "advanced", "concept", "solved", "notes", "practice",
    "chapter", "syllabus", "interview", "step by step"
  ];
  if (educationalCues.some((cue) => title.includes(cue) || desc.includes(cue))) {
    score += 20;
  }

  // B. Credible educational channel indicators (+15 pts)
  const channelCues = [
    "academy", "code", "tech", "tutorial", "school", "class", "learning",
    "geeks", "freecodecamp", "gate", "education", "study", "engineering",
    "edureka", "simplilearn", "cs", "computer", "physics", "khan", "telusko", "mosh"
  ];
  if (channelCues.some((cue) => channel.includes(cue))) {
    score += 15;
  }

  // C. Video Duration suitability for student learning (+15 pts / -40 pts)
  if (durationSec > 0) {
    if (durationSec < 90) {
      // YouTube Shorts / clips (< 90 seconds) have virtually no study depth
      score -= 40;
    } else if (durationSec >= 600 && durationSec <= 7200) {
      // 10 mins to 2 hours: ideal comprehensive lecture / tutorial
      score += 15;
    } else if (durationSec > 7200) {
      // 2+ hours: marathon full courses
      score += 12;
    } else if (durationSec >= 300) {
      // 5 to 10 mins: concise concept walkthrough
      score += 8;
    }
  }

  // D. Clickbait & Spam detection (-35 pts)
  const spamKeywords = [
    "#shorts", "shorts", "tiktok", "reaction", "funny", "trailer",
    "meme", "status", "prank", "shocking", "omg", "must watch!!!"
  ];
  if (spamKeywords.some((spam) => title.includes(spam))) {
    score -= 35;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 4. Relevance / Recency Score (0 - 100)
 * Query token coverage in title & description, plus supporting recency score.
 */
export function calculateRelevanceScore(video, cleanQuery) {
  let score = 0;
  const title = String(video.title || "").toLowerCase();
  const desc = String(video.description || "").toLowerCase();
  const q = String(cleanQuery || "").toLowerCase().trim();

  if (!q) return 50;

  // Exact phrase match in title (50 pts)
  if (title.includes(q)) {
    score += 50;
  } else {
    // Token-level match in title (up to 40 pts)
    const tokens = q.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0) {
      const matched = tokens.filter((t) => title.includes(t));
      score += Math.round((matched.length / tokens.length) * 40);
    }
  }

  // Query match in description (15 pts)
  if (desc.includes(q)) {
    score += 15;
  }

  // Recency bonus (up to 35 pts)
  const publishTime = new Date(video.publishedAt).getTime();
  if (!isNaN(publishTime)) {
    const ageInDays = (Date.now() - publishTime) / (24 * 60 * 60 * 1000);
    if (ageInDays <= 90) {
      score += 35;
    } else if (ageInDays <= 365) {
      score += 25;
    } else if (ageInDays <= 730) {
      score += 15;
    } else {
      score += 5;
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates normalized multi-factor intelligent ranking score (0 - 100)
 * Formula:
 *   Final Score = 45% * Trending + 30% * Engagement + 15% * Reliability + 10% * Relevance
 */
export function calculateIntelligentRankScore(video, cleanQuery) {
  const trendingScore = calculateTrendingScore(video);
  const engagementScore = calculateEngagementScore(video);
  const reliabilityScore = calculateStudentReliabilityScore(video, cleanQuery);
  const relevanceScore = calculateRelevanceScore(video, cleanQuery);

  const finalScore = Number((
    (RANKING_WEIGHTS.trending * trendingScore) +
    (RANKING_WEIGHTS.engagement * engagementScore) +
    (RANKING_WEIGHTS.reliability * reliabilityScore) +
    (RANKING_WEIGHTS.relevance * relevanceScore)
  ).toFixed(1));

  const publishTime = new Date(video.publishedAt).getTime();
  const ageInDays = isNaN(publishTime)
    ? 365
    : Math.max(0.1, (Date.now() - publishTime) / (24 * 60 * 60 * 1000));
  const viewCount = Math.max(0, Number(video.viewCount) || 0);
  const likeCount = Math.max(0, Number(video.likeCount) || 0);

  return {
    final: finalScore,
    trending: Math.round(trendingScore),
    engagement: Math.round(engagementScore),
    reliability: Math.round(reliabilityScore),
    relevance: Math.round(relevanceScore),
    metrics: {
      viewVelocity: Math.round(viewCount / ageInDays),
      likeRatio: viewCount > 0 ? (likeCount / viewCount) : 0,
      ageInDays: Math.round(ageInDays),
    },
  };
}

/**
 * Calculates rank score for educational playlists (0 - 100).
 * Playlists represent complete courses/series and are highly valuable to students.
 */
export function calculatePlaylistRankScore(playlist, cleanQuery) {
  let score = 56; // High baseline for a curated syllabus playlist
  const title = String(playlist.title || "").toLowerCase();
  const desc = String(playlist.description || "").toLowerCase();
  const channel = String(playlist.channelTitle || "").toLowerCase();
  const q = String(cleanQuery || "").toLowerCase().trim();
  const itemCount = Number(playlist.itemCount) || 0;

  // 1. Query relevance in title (up to 30 pts)
  if (title.includes(q)) {
    score += 30;
  } else {
    const tokens = q.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0) {
      const matched = tokens.filter((t) => title.includes(t));
      score += Math.round((matched.length / tokens.length) * 24);
    }
  }

  // 2. Extra boost if user searched for "playlist", "series", "course", "all", "full"
  const playlistKeywords = ["playlist", "series", "course", "full", "complete", "all"];
  if (playlistKeywords.some((kw) => q.includes(kw))) {
    score += 15;
  }

  // 3. Educational quality cues (+15 pts)
  const educationalCues = [
    "tutorial", "course", "complete", "lecture", "placement", "learn", "roadmap",
    "basics", "engineering", "gate", "masterclass", "hindi", "beginner", "advanced", "syllabus"
  ];
  if (educationalCues.some((c) => title.includes(c) || desc.includes(c))) {
    score += 15;
  }

  // 4. Channel credibility (+10 pts)
  const channelCues = ["academy", "code", "tech", "tutorial", "school", "geeks", "freecodecamp", "gate", "edureka", "simplilearn", "smasher"];
  if (channelCues.some((c) => channel.includes(c))) {
    score += 10;
  }

  // 5. Playlist size suitability (+10 pts)
  if (itemCount >= 5 && itemCount <= 80) {
    score += 10; // Ideal comprehensive course size
  } else if (itemCount > 80) {
    score += 6;
  } else if (itemCount >= 2) {
    score += 4;
  }

  // 6. Recency factor (+10 pts)
  const publishTime = new Date(playlist.publishedAt).getTime();
  if (!isNaN(publishTime)) {
    const ageInDays = (Date.now() - publishTime) / (24 * 60 * 60 * 1000);
    if (ageInDays <= 180) score += 10;
    else if (ageInDays <= 365) score += 6;
  }

  const finalScore = Math.min(100, Math.max(0, score));

  return {
    final: finalScore,
    trending: Math.round(finalScore * 0.75),
    engagement: 75,
    reliability: 90,
    relevance: title.includes(q) ? 95 : 65,
    metrics: {
      itemCount,
      likeRatio: 0.05,
    },
  };
}

// Backward-compatible alias
export function calculateBestSuggestedScore(video, query) {
  return calculateIntelligentRankScore(video, query).final;
}


