import sys
import json
from ytmusicapi import YTMusic

def main():
    try:
        # Check if browser cookie / oauth file exists
        yt = YTMusic()
        home = yt.get_home(limit=6)
        formatted_sections = []

        for section in home:
            title = section.get('title', '')
            contents = section.get('contents', [])
            items = []

            for item in contents:
                video_id = item.get('videoId')
                title_item = item.get('title')
                thumbnails = item.get('thumbnails', [])
                
                # Artists
                artists = item.get('artists', [])
                artist_name = 'Artist'
                if isinstance(artists, list) and len(artists) > 0:
                    artist_name = ', '.join([a.get('name', '') for a in artists if isinstance(a, dict)])
                elif isinstance(item.get('artist'), dict):
                    artist_name = item['artist'].get('name', 'Artist')
                elif isinstance(item.get('subscribers'), str):
                    artist_name = item.get('subscribers')

                if video_id and title_item:
                    items.append({
                        'videoId': video_id,
                        'name': title_item,
                        'artist': {'name': artist_name},
                        'thumbnails': thumbnails,
                        'type': 'SONG'
                    })
                elif not video_id and item.get('playlistId'):
                    # Playlist
                    items.append({
                        'videoId': item.get('playlistId'),
                        'name': title_item,
                        'artist': {'name': artist_name},
                        'thumbnails': thumbnails,
                        'type': 'PLAYLIST'
                    })

            if items and title:
                formatted_sections.append({
                    'title': title,
                    'items': items
                })

        print(json.dumps({'sections': formatted_sections}))
    except Exception as e:
        print(json.dumps({'error': str(e), 'sections': []}))

if __name__ == '__main__':
    main()
