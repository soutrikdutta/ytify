export const YOUTUBE_API_KEY = 'AIzaSyA1K6WBNouTUucTtgrCKepS5h-n6Sc_fKU';

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface Artist {
  name: string;
  artistId?: string;
}

export interface Song {
  videoId: string;
  name: string;
  type?: string;
  artist?: Artist | string;
  artists?: { name: string; id?: string }[];
  album?: { name: string; albumId?: string } | null;
  duration?: number | string | null;
  views?: string;
  thumbnails?: Thumbnail[];
}

export interface ExploreSection {
  title: string;
  items: Song[];
}
