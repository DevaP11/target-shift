import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Play, TimerOff, LucideTimer } from 'lucide-react';

// Tailwind utility for hiding scrollbar on the rail container
const SCROLLBAR_HIDE_STYLE = { scrollbarWidth: 'none', msOverflowStyle: 'none' };

// Mock Hero content (You'd replace this with actual featured content logic)
const HERO_CONTENT = {
  title: 'Napoleon',
  description: 'A thrilling documentary series exploring the lives and struggles of software engineers who build the world’s most complex digital platforms.',
  image: 'https://static.eam.diagnal.com/Organizations/diagnal/Projects/enlight/Environments/enlightEntDemo/assets/Napoleon-Hero-new_9640.jpg', // Placeholder for a wide banner image
  year: '2024',
  rating: 'TV-MA',
  duration: '2 hours 28 minutes',
};

// --- Component: RailItem (Single movie/show thumbnail) ---
const RailItem = React.memo(({ item, onClick }) => (
  <div
    onClick={() => onClick(item)}
    className="flex-shrink-0 w-64 cursor-pointer transform transition-transform duration-300 hover:scale-[1.08] hover:z-20 shadow-xl rounded-lg overflow-hidden relative"
  >
    <img
      src={item.image}
      alt={item.title}
      className="w-full h-36 object-cover"
    />
    {/* Optional: Add title hover effect */}
    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-36 object-cover"
      />
    </div>
  </div>
));

// --- Component: MovieDetailsModal ---
const MovieDetailsModal = ({ selectedItem, onClose }) => {
  const modalRef = useRef();

  useEffect(() => {

    // Handler to close modal on outside click
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handlePlayNow = () => {
    console.log(`Attempting to play: ${selectedItem.title}`);
    // Simulate API call to playback service
    localStorage.setItem("lastWatchedItem",selectedItem?.id)
    window.location.href = "/player"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 transition-opacity duration-300">
      <div
        ref={modalRef}
        className="bg-zinc-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100"
      >
        <div className="relative">
          {/* Hero Image */}
          <img
            src={selectedItem.image}
            alt={selectedItem.title}
            className="w-full h-[30rem] object-cover rounded-t-xl"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/1200x480/333/fff?text=No+Image';
            }}
          />
          {/* Title and Play Button Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent p-8">
            <h2 className="text-white text-5xl font-extrabold mb-4 drop-shadow-lg">
              {selectedItem.title}
            </h2>
            <button
              onClick={handlePlayNow}
              className="flex items-center bg-white text-black font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-300 transition-colors shadow-lg"
            >
              <Play className="w-6 h-6 mr-2 fill-black" />
              Play Now
            </button>
          </div>

          {/* Close Button (Hidden, but kept for accessibility/escape key) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-60 rounded-full p-2"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Details Content */}
        <div className="p-8">
          {/* Metadata Row (Simulated) */}
          <div className="flex items-center text-lg mb-6">
            {selectedItem?.percentage && <span className={`${(selectedItem?.percentage) > 50 ? 'text-green-400' : 'text-red-400'} font-semibold mr-4`}>{`${selectedItem?.percentage}% Match`}</span>}
            <span className="text-gray-400 mr-4">{selectedItem.year || HERO_CONTENT.year}</span>
            <span className="text-gray-400 border border-gray-400 px-1.5 py-0.5 rounded text-sm mr-4">
              {"U"}
            </span>
            <span className="text-gray-400">{selectedItem.duration || HERO_CONTENT.duration}</span>
          </div>

          <div className="flex gap-8">
            {/* Description */}
            <div className="flex-1">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {selectedItem.description}
              </p>
            </div>

            {/* Additional Info (Cast/Genres) */}
            <div className="w-1/3 space-y-4">
              {/* Cast */}
              {selectedItem.cast && selectedItem.cast.length > 0 && (
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-semibold">Cast: </span>
                  {selectedItem.cast.slice(0, 3).join(', ')}
                  {selectedItem.cast.length > 3 && (
                    <span className="text-gray-500">, more</span>
                  )}
                </p>
              )}

              {/* Genres */}
              {selectedItem.genre && selectedItem.genre.length > 0 && (
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-semibold">Genres: </span>
                  {selectedItem.genre.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function NetflixApp() {
  const [rails, setRails] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRails();
  }, []);

  const fetchRails = async () => {
    try {
      setLoading(true);
      const lastWatchedItem =localStorage.getItem("lastWatchedItem")

      const railPromises = ["TRENDING_MOVIES", "RECENTLY_ADDED", "LEAVING_SOON"].map(id => {
        const url =`http://localhost:3000/feed/${id}`  + (lastWatchedItem? `?lastWatchedItem=${lastWatchedItem}` : '')
        return fetch(url)
          .then(res => res.json())
          // NOTE: The backend structure seems to use 'items' in the front-end but 'content' in the back-end response for the mapping logic. I've corrected the mapping to use 'content' for the RailItem component, but I'll update the fetch to expect the correct property name or handle both. Assuming the API returns `{ id, title, content: [...] }`.
          .catch(err => {
            console.error(`Failed to fetch rail ${id}:`, err);
            return { id, title: id.replace('_', ' '), content: [] };
          })
      }

      );

      const railsData = await Promise.all(railPromises);
      setRails(railsData);
    } catch (error) {
      console.error('Error fetching rails:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollRail = (railIndex, direction) => {
    const container = document.getElementById(`rail-${railIndex}`);
    if (container) {
      // Adjusted scroll amount for a more dramatic scroll
      const scrollAmount = direction === 'left' ? -container.clientWidth * 0.8 : container.clientWidth * 0.8;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header (Top Nav) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent p-4 flex items-center transition-all duration-300">
        <h1 className="text-red-600 text-3xl font-extrabold mr-10">NotNetflix</h1>
        {/* Simple Navigation */}
        <nav className="space-x-4 text-white text-sm">
          <a href="#" className="font-bold">Home</a>
          <a href="#" className="hover:text-gray-900">TV Shows</a>
          <a href="#" className="hover:text-gray-900">Movies</a>
          <a href="#" className="hover:text-gray-900">New & Popular</a>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative h-[80vh] bg-cover bg-center" style={{ backgroundImage: `url(${HERO_CONTENT.image})` }}>
        {/* Black Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-16 pb-24 max-w-2xl">
          <h2 className="text-white text-7xl font-extrabold mb-6 drop-shadow-lg">
            {HERO_CONTENT.title}
          </h2>
          <p className="text-white text-xl mb-8 drop-shadow-md line-clamp-3">
            {HERO_CONTENT.description}
          </p>
          <button
            onClick={() => console.log('Play Hero Content')}
            className="flex items-center bg-white text-black font-bold py-3 px-8 rounded-lg text-xl hover:bg-gray-300 transition-colors shadow-lg"
          >
            <LucideTimer className="w-7 h-7 mr-2" />
            Coming Soon
          </button>
        </div>
      </div>

      {/* Main Content (Rails) */}
      <div className="pb-12 px-8 relative z-10">
        {rails.map((rail, railIndex) => (
          <div key={railIndex} className="mb-12">
            <h2 className="text-white text-2xl font-semibold mb-4 ml-2">
              {rail.id || `Category ${railIndex + 1}`}
            </h2>

            <div className="relative group">
              {/* Left Arrow */}
              <button
                onClick={() => scrollRail(railIndex, 'left')}
                className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/20 bg-opacity-0 group-hover:bg-opacity-70 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
              >
                <ChevronLeft size={48} />
              </button>

              {/* Rail Container */}
              <div
                id={`rail-${railIndex}`}
                className="flex gap-2 overflow-x-auto scroll-smooth py-2" // Added py-2 for better hover visibility
                style={SCROLLBAR_HIDE_STYLE}
              >
                {rail.content && rail.content.map((item, itemIndex) => (
                  <RailItem
                    key={itemIndex}
                    item={item}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => scrollRail(railIndex, 'right')}
                className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/20 bg-opacity-0 group-hover:bg-opacity-70 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
              >
                <ChevronRight size={48} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <MovieDetailsModal
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Global CSS for scrollbar hide (if needed outside the component) */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
      `}</style>
    </div>
  );
}
