export function parseYouTubeUrl(url) {
  if (!url) return {};
  const videoRegex = /(?:youtube\.com\/.+(?:v=|embed\/|shorts\/)|youtu\.be\/)([0-9A-Za-z_-]{11})/;
  const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
  const videoMatch = url.match(videoRegex);
  const playlistMatch = url.match(playlistRegex);
  return {
    videoId: videoMatch ? videoMatch[1] : null,
    playlistId: playlistMatch ? playlistMatch[1] : null,
  };
}
