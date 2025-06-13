import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Globe, X, Loader2 } from 'lucide-react';
import { GeocodingResult } from '../types/weather';
import { searchCities, searchCitiesAdvanced } from '../utils/weatherApi';

interface CitySearchProps {
  onCitySelect: (city: GeocodingResult) => void;
  selectedCity: GeocodingResult | null;
}

const CitySearch: React.FC<CitySearchProps> = ({ onCitySelect, selectedCity }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchForCities = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        // Use advanced search for better global coverage
        const results = searchMode === 'advanced' 
          ? await searchCitiesAdvanced(query, 25)
          : await searchCities(query);
        
        setSuggestions(results);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchForCities, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, searchMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Switch to advanced search for longer queries
    if (e.target.value.length > 4) {
      setSearchMode('advanced');
    } else {
      setSearchMode('basic');
    }
  };

  const handleCitySelect = (city: GeocodingResult) => {
    onCitySelect(city);
    setQuery('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleCitySelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const clearSelection = () => {
    setQuery('');
    setShowSuggestions(false);
    setSearchMode('basic');
  };

  const getCountryFlag = (countryCode: string) => {
    try {
      return String.fromCodePoint(
        ...[...countryCode.toUpperCase()].map(char => 127397 + char.charCodeAt(0))
      );
    } catch {
      return '🌍';
    }
  };

  const getCountryName = (countryCode: string) => {
    const countryNames: Record<string, string> = {
      'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'AU': 'Australia',
      'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
      'BR': 'Brazil', 'AR': 'Argentina', 'MX': 'Mexico', 'IN': 'India', 'CN': 'China',
      'JP': 'Japan', 'KR': 'South Korea', 'RU': 'Russia', 'ZA': 'South Africa',
      'NG': 'Nigeria', 'EG': 'Egypt', 'KE': 'Kenya', 'MA': 'Morocco', 'GH': 'Ghana',
      'ET': 'Ethiopia', 'TN': 'Tunisia', 'DZ': 'Algeria', 'TH': 'Thailand', 'ID': 'Indonesia',
      'PH': 'Philippines', 'SG': 'Singapore', 'MY': 'Malaysia', 'VN': 'Vietnam',
      'BD': 'Bangladesh', 'PK': 'Pakistan', 'IR': 'Iran', 'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates', 'TR': 'Turkey', 'UA': 'Ukraine', 'PL': 'Poland',
      'CZ': 'Czech Republic', 'AT': 'Austria', 'CH': 'Switzerland', 'SE': 'Sweden',
      'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'BE': 'Belgium', 'PT': 'Portugal',
      'GR': 'Greece', 'IE': 'Ireland', 'HU': 'Hungary', 'CL': 'Chile', 'PE': 'Peru',
      'CO': 'Colombia', 'VE': 'Venezuela', 'EC': 'Ecuador', 'BO': 'Bolivia',
      'UY': 'Uruguay', 'PY': 'Paraguay', 'GY': 'Guyana', 'SR': 'Suriname',
      'NZ': 'New Zealand', 'FJ': 'Fiji', 'WS': 'Samoa', 'TO': 'Tonga', 'VU': 'Vanuatu'
    };
    return countryNames[countryCode] || countryCode;
  };

  const formatCityName = (city: GeocodingResult) => {
    const parts = [city.name];
    if (city.state) parts.push(city.state);
    parts.push(getCountryName(city.country));
    return parts.join(', ');
  };

  const getContinentInfo = (countryCode: string) => {
    const continents: Record<string, { name: string; emoji: string }> = {
      // Africa
      'NG': { name: 'Africa', emoji: '🌍' }, 'EG': { name: 'Africa', emoji: '🌍' },
      'ZA': { name: 'Africa', emoji: '🌍' }, 'KE': { name: 'Africa', emoji: '🌍' },
      'MA': { name: 'Africa', emoji: '🌍' }, 'GH': { name: 'Africa', emoji: '🌍' },
      'ET': { name: 'Africa', emoji: '🌍' }, 'TN': { name: 'Africa', emoji: '🌍' },
      'DZ': { name: 'Africa', emoji: '🌍' },
      
      // Asia
      'CN': { name: 'Asia', emoji: '🌏' }, 'IN': { name: 'Asia', emoji: '🌏' },
      'JP': { name: 'Asia', emoji: '🌏' }, 'KR': { name: 'Asia', emoji: '🌏' },
      'TH': { name: 'Asia', emoji: '🌏' }, 'ID': { name: 'Asia', emoji: '🌏' },
      'PH': { name: 'Asia', emoji: '🌏' }, 'SG': { name: 'Asia', emoji: '🌏' },
      'MY': { name: 'Asia', emoji: '🌏' }, 'VN': { name: 'Asia', emoji: '🌏' },
      'BD': { name: 'Asia', emoji: '🌏' }, 'PK': { name: 'Asia', emoji: '🌏' },
      'IR': { name: 'Asia', emoji: '🌏' }, 'SA': { name: 'Asia', emoji: '🌏' },
      'AE': { name: 'Asia', emoji: '🌏' }, 'TR': { name: 'Asia', emoji: '🌏' },
      
      // Europe
      'GB': { name: 'Europe', emoji: '🌍' }, 'FR': { name: 'Europe', emoji: '🌍' },
      'DE': { name: 'Europe', emoji: '🌍' }, 'IT': { name: 'Europe', emoji: '🌍' },
      'ES': { name: 'Europe', emoji: '🌍' }, 'NL': { name: 'Europe', emoji: '🌍' },
      'RU': { name: 'Europe', emoji: '🌍' }, 'UA': { name: 'Europe', emoji: '🌍' },
      'PL': { name: 'Europe', emoji: '🌍' }, 'CZ': { name: 'Europe', emoji: '🌍' },
      'AT': { name: 'Europe', emoji: '🌍' }, 'CH': { name: 'Europe', emoji: '🌍' },
      'SE': { name: 'Europe', emoji: '🌍' }, 'NO': { name: 'Europe', emoji: '🌍' },
      'DK': { name: 'Europe', emoji: '🌍' }, 'FI': { name: 'Europe', emoji: '🌍' },
      'BE': { name: 'Europe', emoji: '🌍' }, 'PT': { name: 'Europe', emoji: '🌍' },
      'GR': { name: 'Europe', emoji: '🌍' }, 'IE': { name: 'Europe', emoji: '🌍' },
      'HU': { name: 'Europe', emoji: '🌍' },
      
      // North America
      'US': { name: 'North America', emoji: '🌎' }, 'CA': { name: 'North America', emoji: '🌎' },
      'MX': { name: 'North America', emoji: '🌎' },
      
      // South America
      'BR': { name: 'South America', emoji: '🌎' }, 'AR': { name: 'South America', emoji: '🌎' },
      'CL': { name: 'South America', emoji: '🌎' }, 'PE': { name: 'South America', emoji: '🌎' },
      'CO': { name: 'South America', emoji: '🌎' }, 'VE': { name: 'South America', emoji: '🌎' },
      'EC': { name: 'South America', emoji: '🌎' }, 'BO': { name: 'South America', emoji: '🌎' },
      'UY': { name: 'South America', emoji: '🌎' }, 'PY': { name: 'South America', emoji: '🌎' },
      'GY': { name: 'South America', emoji: '🌎' }, 'SR': { name: 'South America', emoji: '🌎' },
      
      // Oceania
      'AU': { name: 'Oceania', emoji: '🌏' }, 'NZ': { name: 'Oceania', emoji: '🌏' },
      'FJ': { name: 'Oceania', emoji: '🌏' }, 'WS': { name: 'Oceania', emoji: '🌏' },
      'TO': { name: 'Oceania', emoji: '🌏' }, 'VU': { name: 'Oceania', emoji: '🌏' }
    };
    
    return continents[countryCode] || { name: 'Unknown', emoji: '🌍' };
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder="Search for any city worldwide... (e.g., Lagos, Cairo, Tokyo, New York, São Paulo)"
            className="w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-lg text-gray-800 text-lg font-medium placeholder-gray-500"
          />
          {query && (
            <button
              onClick={clearSelection}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        )}

        {/* Search Mode Indicator */}
        {query.length > 4 && (
          <div className="absolute top-full left-0 mt-1">
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              🔍 Advanced Global Search
            </span>
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
            {suggestions.map((city, index) => {
              const continent = getContinentInfo(city.country);
              return (
                <button
                  key={`${city.name}-${city.country}-${city.state || ''}-${city.lat}-${city.lon}`}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                    index === highlightedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCountryFlag(city.country)}</span>
                    <span className="text-lg">{continent.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 text-lg">{city.name}</div>
                    <div className="text-sm text-gray-600">
                      {city.state && `${city.state}, `}{getCountryName(city.country)}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{continent.name}</span>
                      <span>•</span>
                      <span>{city.lat.toFixed(4)}°, {city.lon.toFixed(4)}°</span>
                    </div>
                  </div>
                  <MapPin className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {showSuggestions && suggestions.length === 0 && query.length >= 2 && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-6 z-50">
            <div className="text-center text-gray-500">
              <Globe className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold">No cities found for "{query}"</p>
              <p className="text-sm mt-1">Try searching for:</p>
              <div className="text-sm mt-2 space-y-1">
                <p>• Major cities: London, Tokyo, New York, São Paulo</p>
                <p>• African cities: Lagos, Cairo, Nairobi, Cape Town</p>
                <p>• Asian cities: Mumbai, Bangkok, Jakarta, Manila</p>
                <p>• Or any city name in your local language</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected City Info */}
      {selectedCity && (
        <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCountryFlag(selectedCity.country)}</span>
              <span className="text-lg">{getContinentInfo(selectedCity.country).emoji}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg">
                {selectedCity.name}
              </h3>
              <p className="text-gray-600">
                {selectedCity.state && `${selectedCity.state}, `}{getCountryName(selectedCity.country)}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span>{getContinentInfo(selectedCity.country).name}</span>
                <span>•</span>
                <span>Coordinates: {selectedCity.lat.toFixed(4)}°, {selectedCity.lon.toFixed(4)}°</span>
              </div>
            </div>
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
        </div>
      )}

      {/* Global Coverage Info */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">🌍 Complete Global Coverage</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span>🌍</span>
                <span>Africa</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌏</span>
                <span>Asia</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌍</span>
                <span>Europe</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌎</span>
                <span>Americas</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌏</span>
                <span>Oceania</span>
              </div>
            </div>
            <p className="mt-2">
              Search for cities from all continents. The app uses OpenWeatherMap's comprehensive global database with thousands of cities worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitySearch;