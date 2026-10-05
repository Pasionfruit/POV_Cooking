const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])

export function parseYouTubeVideoId(value) {
  if (!value?.trim()) return null

  try {
    const input = value.trim()
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

    let videoId = null
    if (url.hostname.endsWith('youtu.be')) {
      videoId = url.pathname.split('/').filter(Boolean)[0]
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      const segments = url.pathname.split('/').filter(Boolean)
      if (['shorts', 'embed', 'live'].includes(segments[0])) videoId = segments[1]
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId || '') ? videoId : null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(value) {
  const videoId = parseYouTubeVideoId(value)
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1` : null
}