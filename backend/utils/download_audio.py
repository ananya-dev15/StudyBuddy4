import sys
import os
import yt_dlp

def download_audio(video_id, output_path):
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "format": "m4a/bestaudio/best",
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "mweb"]
            }
        }

    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

if __name__ == "__main__":
    if len(sys.argv) > 2:
        v_id = sys.argv[1]
        out = sys.argv[2]
        try:
            download_audio(v_id, out)
            if os.path.exists(out) and os.path.getsize(out) > 0:
                print("SUCCESS")
            else:
                print("FAILED")
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
