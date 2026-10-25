import React, { useState } from 'react';
import { Check, Search, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useAuth, type UserPreferences } from '../context/AuthContext';

interface TasteOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface SeedArtist {
  name: string;
  genre: string;
  imageUrl: string;
}

const POPULAR_ARTISTS: SeedArtist[] = [
  { 
    name: 'Arijit Singh', 
    genre: 'Bollywood', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Arijit_Singh_performance_at_Chandigarh_2025.jpg/500px-Arijit_Singh_performance_at_Chandigarh_2025.jpg' 
  },
  { 
    name: 'The Weeknd', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/The_Weeknd_Portrait_by_Brian_Ziff.jpg/500px-The_Weeknd_Portrait_by_Brian_Ziff.jpg' 
  },
  { 
    name: 'Taylor Swift', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/500px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png' 
  },
  { 
    name: 'Diljit Dosanjh', 
    genre: 'Punjabi', 
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Diljit_Dosanjh.jpg' 
  },
  { 
    name: 'Drake', 
    genre: 'Hip-Hop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Drake_at_The_Carter_Effect_2017_%2836818935200%29_%28cropped%29.jpg/500px-Drake_at_The_Carter_Effect_2017_%2836818935200%29_%28cropped%29.jpg' 
  },
  { 
    name: 'Karan Aujla', 
    genre: 'Punjabi', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Karan_Aujla_2020.jpg/500px-Karan_Aujla_2020.jpg' 
  },
  { 
    name: 'Shreya Ghoshal', 
    genre: 'Bollywood', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Shreya_Ghoshal_Behindwoods_Gold_Icons_Awards_2023_%28cropped%29.jpg/500px-Shreya_Ghoshal_Behindwoods_Gold_Icons_Awards_2023_%28cropped%29.jpg' 
  },
  { 
    name: 'Billie Eilish', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/BillieEilishO2140725-39_-_54665577407_%28cropped%29.jpg/500px-BillieEilishO2140725-39_-_54665577407_%28cropped%29.jpg' 
  },
  { 
    name: 'Travis Scott', 
    genre: 'Hip-Hop', 
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Travis_Scott_-_Openair_Frauenfeld_2019_08_%28cropped%29.jpg/500px-Travis_Scott_-_Openair_Frauenfeld_2019_08_%28cropped%29.jpg' 
  },
  { 
    name: 'AP Dhillon', 
    genre: 'Punjabi', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/AP_Dhillon_CA.jpg/500px-AP_Dhillon_CA.jpg' 
  },
  { 
    name: 'Ed Sheeran', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Ed_Sheeran_2022_%283x4_crop%29.jpg/500px-Ed_Sheeran_2022_%283x4_crop%29.jpg' 
  },
  { 
    name: 'Sidhu Moose Wala', 
    genre: 'Punjabi', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Sidhu_Moose_Wala_during_the_shooting_of_his_film_Moosa_Jatt_%28cropped%29.jpg/500px-Sidhu_Moose_Wala_during_the_shooting_of_his_film_Moosa_Jatt_%28cropped%29.jpg' 
  },
  { 
    name: 'Post Malone', 
    genre: 'Hip-Hop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Post_Malone_July_2021_%28cropped%29.jpg/500px-Post_Malone_July_2021_%28cropped%29.jpg' 
  },
  { 
    name: 'Pritam', 
    genre: 'Bollywood', 
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pritam_Chakraborty.jpg/500px-Pritam_Chakraborty.jpg' 
  },
  { 
    name: 'Dua Lipa', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Dua_Lipa-69798_%28cropped%29.jpg/500px-Dua_Lipa-69798_%28cropped%29.jpg' 
  },
  { 
    name: 'Bruno Mars', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg/500px-BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg' 
  },
  { 
    name: 'A.R. Rahman', 
    genre: 'Bollywood', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg/500px-AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg' 
  },
  { 
    name: 'Olivia Rodrigo', 
    genre: 'Pop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Glasto2025-546_%28cropped%29_2.jpg/500px-Glasto2025-546_%28cropped%29_2.jpg' 
  },
  { 
    name: 'Kendrick Lamar', 
    genre: 'Hip-Hop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/KendrickSZASPurs230725-144_%28cropped%29_desaturated.jpg/500px-KendrickSZASPurs230725-144_%28cropped%29_desaturated.jpg' 
  },
  { 
    name: 'Badshah', 
    genre: 'Hip-Hop', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Badshah_in_2017_at_Mirchi_Music_Awards.png/500px-Badshah_in_2017_at_Mirchi_Music_Awards.png' 
  },
  { 
    name: 'Anuv Jain', 
    genre: 'Indie', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Anuv_Jain_at_Ludhiana_concert.jpg/500px-Anuv_Jain_at_Ludhiana_concert.jpg' 
  },
  { 
    name: 'Prateek Kuhad', 
    genre: 'Indie', 
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Prateek_Kuhad_New.jpg/500px-Prateek_Kuhad_New.jpg' 
  }
];

const GENRES = ['All', 'Bollywood', 'Pop', 'Hip-Hop', 'Punjabi', 'Indie'];

export const TasteOnboardingModal: React.FC<TasteOnboardingModalProps> = ({ isOpen, onClose, onCompleted }) => {
  const { userData, savePreferences } = useAuth();
  const [selectedArtists, setSelectedArtists] = useState<string[]>(() => {
    return userData.preferences?.artists || [];
  });
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    return userData.preferences?.genres || [];
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const toggleArtist = (name: string) => {
    if (selectedArtists.includes(name)) {
      setSelectedArtists(prev => prev.filter(a => a !== name));
    } else {
      setSelectedArtists(prev => [...prev, name]);
    }
  };

  const toggleGenre = (genre: string) => {
    if (genre === 'All') return;
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(prev => prev.filter(g => g !== genre));
    } else {
      setSelectedGenres(prev => [...prev, genre]);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('ytify_taste_completed', 'true');
    } catch {}
    onClose();
  };

  const handleSave = () => {
    try {
      localStorage.setItem('ytify_taste_completed', 'true');
    } catch {}
    if (selectedArtists.length === 0) {
      onClose();
      return;
    }
    const prefs: UserPreferences = {
      artists: selectedArtists,
      genres: selectedGenres.length > 0 ? selectedGenres : ['Pop', 'Bollywood', 'Indie'],
      languages: ['Hindi', 'English', 'Punjabi']
    };
    savePreferences(prefs);
    onClose();
    if (onCompleted) onCompleted();
  };

  const filteredArtists = POPULAR_ARTISTS.filter(a => {
    const matchesFilter = activeFilter === 'All' || a.genre === activeFilter;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div 
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] liquid-glass-dock rounded-3xl p-5 sm:p-6 flex flex-col border border-white/20 shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#991b1b] to-[#15803d] flex items-center justify-center text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Personalize Your Feed
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/50 hover:text-white cursor-pointer active:scale-90 transition-all"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          Tell us which artists you like
        </h2>
        <p className="text-xs text-white/60 mb-4">
          Select 5 or more to unlock personalized Ytify recommendations.
        </p>

        {/* Counter Badge */}
        <div className="flex items-center justify-between py-1.5 px-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-xs">
          <span className="text-white/60 font-medium">Selected</span>
          <div className={`flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full ${selectedArtists.length >= 5 ? 'bg-[#15803d]/30 text-emerald-400 border border-[#15803d]/50' : 'bg-white/10 text-white/80'}`}>
            {selectedArtists.length >= 5 && <CheckCircle2 size={13} className="text-emerald-400" />}
            <span>{selectedArtists.length} {selectedArtists.length >= 5 ? 'artists selected' : 'of 5 selected'}</span>
          </div>
        </div>

        {/* Artist Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-3 text-white/40" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or add any artist..."
            className="w-full liquid-glass-card pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Genre Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3 -mx-1 px-1">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => {
                setActiveFilter(g);
                toggleGenre(g);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === g 
                  ? 'liquid-segment-active text-white border-emerald-500/40' 
                  : 'liquid-glass-pill text-white/65 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Artist Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 grid grid-cols-3 gap-3 my-2 max-h-[46vh]">
          {filteredArtists.map(artist => {
            const isSelected = selectedArtists.includes(artist.name);
            return (
              <div
                key={artist.name}
                onClick={() => toggleArtist(artist.name)}
                className={`flex flex-col items-center text-center p-2 rounded-2xl cursor-pointer transition-all select-none active:scale-95 ${
                  isSelected 
                    ? 'bg-gradient-to-b from-[#15803d]/30 to-[#15803d]/10 border border-[#15803d] shadow-[0_0_15px_rgba(21,128,61,0.3)]' 
                    : 'liquid-glass-card hover:bg-white/10'
                }`}
              >
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden mb-2 shadow border border-white/15">
                  <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#15803d]/70 flex items-center justify-center animate-in zoom-in-75 duration-150">
                      <Check size={22} className="text-white stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className={`text-xs font-bold truncate max-w-[95px] ${isSelected ? 'text-emerald-400' : 'text-white/90'}`}>
                  {artist.name}
                </span>
                <span className="text-[10px] text-white/40 truncate max-w-[90px]">
                  {artist.genre}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 mt-2">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white/50 hover:text-white cursor-pointer"
          >
            Skip for now
          </button>

          <button
            onClick={handleSave}
            className={`flex-1 py-3 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              selectedArtists.length >= 5
                ? 'bg-gradient-to-r from-[#991b1b] to-[#15803d] text-white hover:brightness-110 active:scale-95'
                : selectedArtists.length > 0
                ? 'bg-[#15803d] text-white hover:brightness-110'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <span>{selectedArtists.length >= 5 ? 'Done: Customize My Feed' : selectedArtists.length > 0 ? `Done (${selectedArtists.length} selected)` : 'Select artists'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
