import React from 'react';

export const YtifyBrand: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2.5 select-none group cursor-pointer">
      {/* Icon with deep subtle dark glow */}
      <div className={`relative ${iconSize} flex-shrink-0 rounded-full overflow-hidden shadow-[0_0_15px_rgba(21,128,61,0.3)] transition-transform duration-300 group-hover:scale-105`}>
        <img 
          src="/ytify-icon.png" 
          alt="ytify logo" 
          className="w-full h-full object-cover filter contrast-125 brightness-90"
        />
      </div>

      {/* Deep Darker Brand Colors: Deep Red #991b1b & Deep Emerald #15803d */}
      <span className={`font-black tracking-tighter ${textSize} flex items-baseline leading-none`}>
        <span className="text-[#b91c1c] drop-shadow-[0_0_8px_rgba(185,28,28,0.3)]">yt</span>
        <span className="text-[#16a34a] drop-shadow-[0_0_8px_rgba(22,163,74,0.3)]">ify</span>
      </span>
    </div>
  );
};
