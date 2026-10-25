import sys
import json
from ytmusicapi import YTMusic

def main():
    mood = sys.argv[1] if len(sys.argv) > 1 else 'All'
    yt = YTMusic()
    try:
        # Map specific moods to YouTube Music queries
        query_map = {
            'Podcasts': ('Popular Podcasts full episodes', 'community_playlists'),
            'Romance': ('Love & Romance songs', 'songs'),
            'Feel good': ('Feel Good Happy Vibes', 'songs'),
            'Party': ('Party Dance Club Hits', 'songs'),
            'Relax': ('Chill Lofi Relaxing Beats', 'songs'),
            'Commute': ('Commute Travel Songs', 'songs'),
            'Sad': ('Sad Emotional Broken Heart Songs', 'songs'),
            'Sleep': ('Deep Sleep Ambient Relaxing Music', 'songs'),
            'Energize': ('High Energy Workout Motivation', 'songs'),
            'Workout': ('Gym Workout Beats', 'songs')
        }

        if mood in query_map:
            q, f = query_map[mood]
            results = yt.search(q, filter=f, limit=15)
        else:
            results = yt.search(mood + ' music', limit=15)

        items = []
        for item in results:
            vid = item.get('videoId') or item.get('playlistId')
            title = item.get('title')
            thumbs = item.get('thumbnails', [])
            artists = item.get('artists', [])
            artist_name = 'Artist'
            if isinstance(artists, list) and len(artists) > 0:
                artist_name = ', '.join([a.get('name', '') for a in artists if isinstance(a, dict)])
            elif isinstance(item.get('artist'), dict):
                artist_name = item['artist'].get('name', 'Artist')

            if vid and title:
                items.append({
                    'videoId': vid,
                    'name': title,
                    'artist': {'name': artist_name},
                    'thumbnails': thumbs,
                    'type': 'SONG'
                })

        print(json.dumps({'title': f'{mood} Mixes', 'items': items}))
    except Exception as e:
        print(json.dumps({'error': str(e), 'items': []}))

if __name__ == '__main__':
    main()
