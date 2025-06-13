import React, { useState } from 'react';
import { Cloud, MapPin, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import CitySearch from './components/CitySearch';
import WeatherCard from './components/WeatherCard';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { fetchWeatherData, processWeatherData } from './utils/weatherApi';
import { GeocodingResult, ProcessedWeatherData } from './types/weather';

function App() {
  const [selectedCity, setSelectedCity] = useState<GeocodingResult | null>(null);
  const [weatherData, setWeatherData] = useState<ProcessedWeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleCitySelect = async (city: GeocodingResult) => {
    setSelectedCity(city);
    setLoading(true);
    setError(null);

    try {
      const rawData = await fetchWeatherData(city.lat, city.lon);
      const processedData = processWeatherData(rawData);
      
      setWeatherData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (selectedCity) {
      handleCitySelect(selectedCity);
    }
  };

  const handleRefresh = () => {
    if (selectedCity) {
      handleCitySelect(selectedCity);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Global Weather Forecast
            </h1>
          </div>
          <p className="text-white/90 text-lg md:text-xl max-w-4xl mx-auto">
            Get accurate weather forecasts for any city worldwide. Search across all continents - from Lagos to Tokyo, 
            New York to São Paulo, Cairo to Sydney. Complete global coverage with real-time data.
          </p>
        </div>

        {/* City Search */}
        <CitySearch
          onCitySelect={handleCitySelect}
          selectedCity={selectedCity}
        />

        {/* Weather Display */}
        {selectedCity && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-white" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {selectedCity.name}
                  {selectedCity.state && `, ${selectedCity.state}`}
                  , {getCountryName(selectedCity.country)}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <div className="text-white/70 text-sm">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loading && <LoadingSpinner />}
            
            {error && (
              <ErrorMessage message={error} onRetry={handleRetry} />
            )}

            {!loading && !error && weatherData.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {weatherData.map((weather, index) => (
                    <WeatherCard
                      key={weather.date}
                      weather={weather}
                      isToday={index === 0}
                    />
                  ))}
                </div>
                
                {/* Data Source Info */}
                <div className="mt-6 text-center">
                  <p className="text-white/70 text-sm">
                    Weather data updates every 3 hours • Powered by OpenWeatherMap API
                  </p>
                </div>
              </>
            )}

            {!loading && !error && weatherData.length === 0 && selectedCity && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-4" />
                <p className="text-white/80 text-lg">No weather data available for this location.</p>
                <button
                  onClick={handleRetry}
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Features */}
        {!selectedCity && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-white mb-2">Africa</h3>
              <p className="text-white/80 text-sm">Lagos, Cairo, Nairobi, Cape Town, Casablanca, Johannesburg</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌏</div>
              <h3 className="text-xl font-bold text-white mb-2">Asia</h3>
              <p className="text-white/80 text-sm">Tokyo, Mumbai, Beijing, Bangkok, Jakarta, Singapore</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌎</div>
              <h3 className="text-xl font-bold text-white mb-2">Americas</h3>
              <p className="text-white/80 text-sm">New York, São Paulo, Toronto, Mexico City, Buenos Aires</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🌏</div>
              <h3 className="text-xl font-bold text-white mb-2">Oceania</h3>
              <p className="text-white/80 text-sm">Sydney, Melbourne, Auckland, Fiji, Samoa, Vanuatu</p>
            </div>
          </div>
        )}

        {/* Additional Features */}
        {!selectedCity && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-white mb-2">Real-time Updates</h3>
              <p className="text-white/80">Weather data updates every 3 hours for maximum accuracy across all time zones.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Search</h3>
              <p className="text-white/80">Intelligent autocomplete with global city database covering thousands of locations.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">Detailed Forecasts</h3>
              <p className="text-white/80">7-day forecasts with temperature, humidity, wind, pressure, and precipitation data.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/70 text-sm">
            Global Weather Forecast • Powered by OpenWeatherMap API • Covering 200+ Countries
          </p>
          <p className="text-white/50 text-xs mt-2">
            © 2024 Global Weather App • Complete worldwide coverage including Africa, Asia, Europe, Americas & Oceania
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;