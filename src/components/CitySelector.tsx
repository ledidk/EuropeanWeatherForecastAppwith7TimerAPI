import React from 'react';
import { MapPin } from 'lucide-react';
import { City } from '../types/weather';

interface CitySelectorProps {
  cities: City[];
  selectedCity: City | null;
  onCitySelect: (city: City) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const CitySelector: React.FC<CitySelectorProps> = ({
  cities,
  selectedCity,
  onCitySelect
}) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(event.target.value);
    if (selectedIndex >= 0 && selectedIndex < cities.length) {
      onCitySelect(cities[selectedIndex]);
    }
  };

  const selectedIndex = selectedCity 
    ? cities.findIndex(city => city.name === selectedCity.name && city.country === selectedCity.country)
    : -1;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      {/* City Select Dropdown */}
      <div className="relative">
        <select
          value={selectedIndex >= 0 ? selectedIndex : ''}
          onChange={handleSelectChange}
          className="w-full p-4 pr-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-lg text-gray-800 appearance-none cursor-pointer text-lg font-medium"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 12px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px'
          }}
        >
          <option value="" disabled>
            Select a European city...
          </option>
          {cities.map((city, index) => (
            <option key={`${city.name}-${city.country}`} value={index}>
              {city.name}, {city.country}
            </option>
          ))}
        </select>
      </div>

      {/* Selected City Info */}
      {selectedCity && (
        <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {selectedCity.name}
              </h3>
              <p className="text-gray-600">{selectedCity.country}</p>
              <p className="text-sm text-gray-500 mt-1">
                Coordinates: {selectedCity.lat.toFixed(4)}°, {selectedCity.lon.toFixed(4)}°
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitySelector;