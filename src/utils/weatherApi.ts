import { WeatherResponse, ProcessedWeatherData, GeocodingResult } from '../types/weather';

// Replace 'demo_key' with your actual OpenWeatherMap API key
// Get a free API key at: https://openweathermap.org/api
const API_KEY = 'demo_key';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// Check if we have a valid API key
const hasValidApiKey = () => API_KEY !== 'demo_key' && API_KEY.length > 10;

// Search for cities by name with comprehensive global coverage
export const searchCities = async (query: string): Promise<GeocodingResult[]> => {
  if (query.length < 2) return [];
  
  // If no valid API key, return demo cities with global representation
  if (!hasValidApiKey()) {
    return getGlobalDemoCities(query);
  }
  
  try {
    // Use OpenWeatherMap's geocoding API for comprehensive global city search
    const response = await fetch(
      `${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=15&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      console.warn('City search failed, using demo data');
      return getGlobalDemoCities(query);
    }
    
    const data = await response.json();
    
    // Remove duplicates and sort by relevance
    const uniqueCities = removeDuplicateCities(data);
    return sortCitiesByRelevance(uniqueCities, query);
  } catch (error) {
    console.warn('City search error, using demo data:', error);
    return getGlobalDemoCities(query);
  }
};

// Enhanced city search with state/province support
export const searchCitiesAdvanced = async (query: string, limit: number = 20): Promise<GeocodingResult[]> => {
  if (query.length < 2) return [];
  
  if (!hasValidApiKey()) {
    return getGlobalDemoCities(query);
  }
  
  try {
    // Search with higher limit for better coverage
    const response = await fetch(
      `${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      return getGlobalDemoCities(query);
    }
    
    const data = await response.json();
    return removeDuplicateCities(data);
  } catch (error) {
    console.warn('Advanced city search error:', error);
    return getGlobalDemoCities(query);
  }
};

// Search cities by coordinates (reverse geocoding)
export const searchCitiesByCoordinates = async (lat: number, lon: number): Promise<GeocodingResult[]> => {
  if (!hasValidApiKey()) {
    return [{
      name: 'Demo Location',
      country: 'XX',
      lat,
      lon
    }];
  }
  
  try {
    const response = await fetch(
      `${GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Reverse geocoding error:', error);
    return [];
  }
};

// Get weather data for a specific location
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherResponse> => {
  // If no valid API key, return demo data immediately
  if (!hasValidApiKey()) {
    console.info('Using demo weather data. To get real weather data, please add your OpenWeatherMap API key to src/utils/weatherApi.ts');
    return getDemoWeatherData(lat, lon);
  }
  
  try {
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      console.warn('Weather API failed, using demo data');
      return getDemoWeatherData(lat, lon);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Weather API Error, using demo data:', error);
    return getDemoWeatherData(lat, lon);
  }
};

// Process weather data into daily forecasts
export const processWeatherData = (data: WeatherResponse): ProcessedWeatherData[] => {
  const dailyForecasts: ProcessedWeatherData[] = [];
  const processedDates = new Set<string>();
  
  // Group by date and take one forecast per day (preferably midday)
  data.list.forEach((forecast) => {
    const date = new Date(forecast.dt * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const hour = date.getHours();
    
    // Skip if we already have this date, unless this is closer to midday
    if (processedDates.has(dateStr)) {
      const existingIndex = dailyForecasts.findIndex(f => f.date === dateStr);
      if (existingIndex >= 0) {
        const existingForecast = dailyForecasts[existingIndex];
        const existingDate = new Date(existingForecast.date + 'T12:00:00');
        const existingHour = existingDate.getHours();
        if (Math.abs(hour - 12) >= Math.abs(existingHour - 12)) {
          return;
        }
        // Replace with better time
        dailyForecasts.splice(existingIndex, 1);
        processedDates.delete(dateStr);
      }
    }
    
    if (dailyForecasts.length >= 7) return;
    
    processedDates.add(dateStr);
    
    const windDirection = getWindDirection(forecast.wind.deg);
    const precipitationAmount = (forecast.rain?.['3h'] || 0) + (forecast.snow?.['3h'] || 0);
    
    dailyForecasts.push({
      date: dateStr,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      temperature: Math.round(forecast.main.temp),
      tempMin: Math.round(forecast.main.temp_min),
      tempMax: Math.round(forecast.main.temp_max),
      condition: forecast.weather[0].main,
      description: forecast.weather[0].description,
      humidity: forecast.main.humidity,
      windSpeed: Math.round(forecast.wind.speed * 3.6), // Convert m/s to km/h
      windDirection,
      precipitation: precipitationAmount,
      precipitationType: forecast.snow?.['3h'] ? 'snow' : forecast.rain?.['3h'] ? 'rain' : 'none',
      cloudCover: Math.round(forecast.clouds.all / 10), // Convert percentage to 0-10 scale
      icon: forecast.weather[0].icon,
      pressure: forecast.main.pressure,
      visibility: Math.round(forecast.visibility / 1000) // Convert to km
    });
  });
  
  return dailyForecasts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Utility functions
const removeDuplicateCities = (cities: GeocodingResult[]): GeocodingResult[] => {
  const seen = new Set<string>();
  return cities.filter(city => {
    const key = `${city.name}-${city.country}-${city.state || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortCitiesByRelevance = (cities: GeocodingResult[], query: string): GeocodingResult[] => {
  const lowerQuery = query.toLowerCase();
  return cities.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // Exact matches first
    if (aName === lowerQuery && bName !== lowerQuery) return -1;
    if (bName === lowerQuery && aName !== lowerQuery) return 1;
    
    // Starts with query
    if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
    if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
    
    // Alphabetical order
    return aName.localeCompare(bName);
  });
};

// Convert wind degrees to direction
const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

// Get weather icon emoji
export const getWeatherIcon = (iconCode: string): string => {
  const iconMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '🌨️', '13n': '🌨️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return iconMap[iconCode] || '☀️';
};

// Comprehensive global demo cities representing all continents and major regions
const getGlobalDemoCities = (query: string): GeocodingResult[] => {
  const globalCities = [
    // Africa
    { name: 'Lagos', country: 'NG', state: 'Lagos', lat: 6.5244, lon: 3.3792 },
    { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
    { name: 'Cape Town', country: 'ZA', state: 'Western Cape', lat: -33.9249, lon: 18.4241 },
    { name: 'Nairobi', country: 'KE', lat: -1.2921, lon: 36.8219 },
    { name: 'Casablanca', country: 'MA', lat: 33.5731, lon: -7.5898 },
    { name: 'Johannesburg', country: 'ZA', state: 'Gauteng', lat: -26.2041, lon: 28.0473 },
    { name: 'Addis Ababa', country: 'ET', lat: 9.1450, lon: 40.4897 },
    { name: 'Accra', country: 'GH', lat: 5.6037, lon: -0.1870 },
    { name: 'Tunis', country: 'TN', lat: 36.8065, lon: 10.1815 },
    { name: 'Algiers', country: 'DZ', lat: 36.7538, lon: 3.0588 },
    
    // Asia
    { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
    { name: 'Mumbai', country: 'IN', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
    { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074 },
    { name: 'Shanghai', country: 'CN', lat: 31.2304, lon: 121.4737 },
    { name: 'Delhi', country: 'IN', lat: 28.7041, lon: 77.1025 },
    { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
    { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.9780 },
    { name: 'Jakarta', country: 'ID', lat: -6.2088, lon: 106.8456 },
    { name: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842 },
    { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
    { name: 'Kuala Lumpur', country: 'MY', lat: 3.1390, lon: 101.6869 },
    { name: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lon: 106.6297 },
    { name: 'Dhaka', country: 'BD', lat: 23.8103, lon: 90.4125 },
    { name: 'Karachi', country: 'PK', state: 'Sindh', lat: 24.8607, lon: 67.0011 },
    { name: 'Tehran', country: 'IR', lat: 35.6892, lon: 51.3890 },
    { name: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753 },
    { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
    
    // Europe
    { name: 'London', country: 'GB', state: 'England', lat: 51.5074, lon: -0.1278 },
    { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
    { name: 'Berlin', country: 'DE', lat: 52.5200, lon: 13.4050 },
    { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038 },
    { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964 },
    { name: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041 },
    { name: 'Vienna', country: 'AT', lat: 48.2082, lon: 16.3738 },
    { name: 'Prague', country: 'CZ', lat: 50.0755, lon: 14.4378 },
    { name: 'Stockholm', country: 'SE', lat: 59.3293, lon: 18.0686 },
    { name: 'Copenhagen', country: 'DK', lat: 55.6761, lon: 12.5683 },
    { name: 'Brussels', country: 'BE', lat: 50.8503, lon: 4.3517 },
    { name: 'Zurich', country: 'CH', lat: 47.3769, lon: 8.5417 },
    { name: 'Oslo', country: 'NO', lat: 59.9139, lon: 10.7522 },
    { name: 'Helsinki', country: 'FI', lat: 60.1699, lon: 24.9384 },
    { name: 'Warsaw', country: 'PL', lat: 52.2297, lon: 21.0122 },
    { name: 'Budapest', country: 'HU', lat: 47.4979, lon: 19.0402 },
    { name: 'Athens', country: 'GR', lat: 37.9838, lon: 23.7275 },
    { name: 'Lisbon', country: 'PT', lat: 38.7223, lon: -9.1393 },
    { name: 'Dublin', country: 'IE', lat: 53.3498, lon: -6.2603 },
    { name: 'Edinburgh', country: 'GB', state: 'Scotland', lat: 55.9533, lon: -3.1883 },
    { name: 'Barcelona', country: 'ES', state: 'Catalonia', lat: 41.3851, lon: 2.1734 },
    { name: 'Milan', country: 'IT', state: 'Lombardy', lat: 45.4642, lon: 9.1900 },
    { name: 'Munich', country: 'DE', state: 'Bavaria', lat: 48.1351, lon: 11.5820 },
    { name: 'Kiev', country: 'UA', lat: 50.4501, lon: 30.5234 },
    { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6176 },
    { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784 },
    
    // North America
    { name: 'New York', country: 'US', state: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'Los Angeles', country: 'US', state: 'California', lat: 34.0522, lon: -118.2437 },
    { name: 'Chicago', country: 'US', state: 'Illinois', lat: 41.8781, lon: -87.6298 },
    { name: 'Toronto', country: 'CA', state: 'Ontario', lat: 43.6532, lon: -79.3832 },
    { name: 'Vancouver', country: 'CA', state: 'British Columbia', lat: 49.2827, lon: -123.1207 },
    { name: 'Montreal', country: 'CA', state: 'Quebec', lat: 45.5017, lon: -73.5673 },
    { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332 },
    { name: 'Miami', country: 'US', state: 'Florida', lat: 25.7617, lon: -80.1918 },
    { name: 'San Francisco', country: 'US', state: 'California', lat: 37.7749, lon: -122.4194 },
    { name: 'Washington', country: 'US', state: 'District of Columbia', lat: 38.9072, lon: -77.0369 },
    { name: 'Boston', country: 'US', state: 'Massachusetts', lat: 42.3601, lon: -71.0589 },
    { name: 'Seattle', country: 'US', state: 'Washington', lat: 47.6062, lon: -122.3321 },
    { name: 'Las Vegas', country: 'US', state: 'Nevada', lat: 36.1699, lon: -115.1398 },
    { name: 'Phoenix', country: 'US', state: 'Arizona', lat: 33.4484, lon: -112.0740 },
    { name: 'Denver', country: 'US', state: 'Colorado', lat: 39.7392, lon: -104.9903 },
    { name: 'Atlanta', country: 'US', state: 'Georgia', lat: 33.7490, lon: -84.3880 },
    { name: 'Dallas', country: 'US', state: 'Texas', lat: 32.7767, lon: -96.7970 },
    { name: 'Houston', country: 'US', state: 'Texas', lat: 29.7604, lon: -95.3698 },
    { name: 'Philadelphia', country: 'US', state: 'Pennsylvania', lat: 39.9526, lon: -75.1652 },
    { name: 'Detroit', country: 'US', state: 'Michigan', lat: 42.3314, lon: -83.0458 },
    { name: 'Minneapolis', country: 'US', state: 'Minnesota', lat: 44.9778, lon: -93.2650 },
    { name: 'San Diego', country: 'US', state: 'California', lat: 32.7157, lon: -117.1611 },
    { name: 'Portland', country: 'US', state: 'Oregon', lat: 45.5152, lon: -122.6784 },
    { name: 'Nashville', country: 'US', state: 'Tennessee', lat: 36.1627, lon: -86.7816 },
    { name: 'New Orleans', country: 'US', state: 'Louisiana', lat: 29.9511, lon: -90.0715 },
    { name: 'Calgary', country: 'CA', state: 'Alberta', lat: 51.0447, lon: -114.0719 },
    { name: 'Ottawa', country: 'CA', state: 'Ontario', lat: 45.4215, lon: -75.6972 },
    { name: 'Winnipeg', country: 'CA', state: 'Manitoba', lat: 49.8951, lon: -97.1384 },
    { name: 'Edmonton', country: 'CA', state: 'Alberta', lat: 53.5461, lon: -113.4938 },
    { name: 'Quebec City', country: 'CA', state: 'Quebec', lat: 46.8139, lon: -71.2080 },
    { name: 'Halifax', country: 'CA', state: 'Nova Scotia', lat: 44.6488, lon: -63.5752 },
    { name: 'Guadalajara', country: 'MX', state: 'Jalisco', lat: 20.6597, lon: -103.3496 },
    { name: 'Monterrey', country: 'MX', state: 'Nuevo León', lat: 25.6866, lon: -100.3161 },
    { name: 'Puebla', country: 'MX', state: 'Puebla', lat: 19.0414, lon: -98.2063 },
    { name: 'Tijuana', country: 'MX', state: 'Baja California', lat: 32.5149, lon: -117.0382 },
    
    // South America
    { name: 'São Paulo', country: 'BR', state: 'São Paulo', lat: -23.5505, lon: -46.6333 },
    { name: 'Rio de Janeiro', country: 'BR', state: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
    { name: 'Buenos Aires', country: 'AR', lat: -34.6118, lon: -58.3960 },
    { name: 'Lima', country: 'PE', lat: -12.0464, lon: -77.0428 },
    { name: 'Bogotá', country: 'CO', lat: 4.7110, lon: -74.0721 },
    { name: 'Santiago', country: 'CL', lat: -33.4489, lon: -70.6693 },
    { name: 'Caracas', country: 'VE', lat: 10.4806, lon: -66.9036 },
    { name: 'Quito', country: 'EC', lat: -0.1807, lon: -78.4678 },
    { name: 'La Paz', country: 'BO', lat: -16.5000, lon: -68.1193 },
    { name: 'Montevideo', country: 'UY', lat: -34.9011, lon: -56.1645 },
    { name: 'Asunción', country: 'PY', lat: -25.2637, lon: -57.5759 },
    { name: 'Georgetown', country: 'GY', lat: 6.8013, lon: -58.1551 },
    { name: 'Paramaribo', country: 'SR', lat: 5.8520, lon: -55.2038 },
    { name: 'Brasília', country: 'BR', state: 'Distrito Federal', lat: -15.8267, lon: -47.9218 },
    { name: 'Salvador', country: 'BR', state: 'Bahia', lat: -12.9714, lon: -38.5014 },
    { name: 'Fortaleza', country: 'BR', state: 'Ceará', lat: -3.7319, lon: -38.5267 },
    { name: 'Belo Horizonte', country: 'BR', state: 'Minas Gerais', lat: -19.9191, lon: -43.9386 },
    { name: 'Manaus', country: 'BR', state: 'Amazonas', lat: -3.1190, lon: -60.0217 },
    { name: 'Recife', country: 'BR', state: 'Pernambuco', lat: -8.0476, lon: -34.8770 },
    { name: 'Porto Alegre', country: 'BR', state: 'Rio Grande do Sul', lat: -30.0346, lon: -51.2177 },
    { name: 'Curitiba', country: 'BR', state: 'Paraná', lat: -25.4284, lon: -49.2733 },
    { name: 'Córdoba', country: 'AR', state: 'Córdoba', lat: -31.4201, lon: -64.1888 },
    { name: 'Rosario', country: 'AR', state: 'Santa Fe', lat: -32.9442, lon: -60.6505 },
    { name: 'Mendoza', country: 'AR', state: 'Mendoza', lat: -32.8895, lon: -68.8458 },
    { name: 'Mar del Plata', country: 'AR', state: 'Buenos Aires', lat: -38.0023, lon: -57.5575 },
    { name: 'Medellín', country: 'CO', state: 'Antioquia', lat: 6.2442, lon: -75.5812 },
    { name: 'Cali', country: 'CO', state: 'Valle del Cauca', lat: 3.4516, lon: -76.5320 },
    { name: 'Barranquilla', country: 'CO', state: 'Atlántico', lat: 10.9639, lon: -74.7964 },
    { name: 'Cartagena', country: 'CO', state: 'Bolívar', lat: 10.3910, lon: -75.4794 },
    { name: 'Valparaíso', country: 'CL', state: 'Valparaíso', lat: -33.0472, lon: -71.6127 },
    { name: 'Concepción', country: 'CL', state: 'Biobío', lat: -36.8270, lon: -73.0498 },
    { name: 'Antofagasta', country: 'CL', state: 'Antofagasta', lat: -23.6509, lon: -70.3975 },
    { name: 'Arequipa', country: 'PE', state: 'Arequipa', lat: -16.4090, lon: -71.5375 },
    { name: 'Trujillo', country: 'PE', state: 'La Libertad', lat: -8.1116, lon: -79.0287 },
    { name: 'Chiclayo', country: 'PE', state: 'Lambayeque', lat: -6.7714, lon: -79.8374 },
    { name: 'Guayaquil', country: 'EC', state: 'Guayas', lat: -2.1894, lon: -79.8890 },
    { name: 'Cuenca', country: 'EC', state: 'Azuay', lat: -2.9001, lon: -79.0059 },
    { name: 'Maracaibo', country: 'VE', state: 'Zulia', lat: 10.6666, lon: -71.6124 },
    { name: 'Valencia', country: 'VE', state: 'Carabobo', lat: 10.1621, lon: -68.0077 },
    { name: 'Barquisimeto', country: 'VE', state: 'Lara', lat: 10.0647, lon: -69.3570 },
    { name: 'Santa Cruz', country: 'BO', state: 'Santa Cruz', lat: -17.7833, lon: -63.1821 },
    { name: 'Cochabamba', country: 'BO', state: 'Cochabamba', lat: -17.3895, lon: -66.1568 },
    { name: 'Sucre', country: 'BO', state: 'Chuquisaca', lat: -19.0196, lon: -65.2619 },
    
    // Oceania
    { name: 'Sydney', country: 'AU', state: 'New South Wales', lat: -33.8688, lon: 151.2093 },
    { name: 'Melbourne', country: 'AU', state: 'Victoria', lat: -37.8136, lon: 144.9631 },
    { name: 'Brisbane', country: 'AU', state: 'Queensland', lat: -27.4698, lon: 153.0251 },
    { name: 'Perth', country: 'AU', state: 'Western Australia', lat: -31.9505, lon: 115.8605 },
    { name: 'Adelaide', country: 'AU', state: 'South Australia', lat: -34.9285, lon: 138.6007 },
    { name: 'Auckland', country: 'NZ', lat: -36.8485, lon: 174.7633 },
    { name: 'Wellington', country: 'NZ', lat: -41.2865, lon: 174.7762 },
    { name: 'Christchurch', country: 'NZ', lat: -43.5321, lon: 172.6362 },
    { name: 'Hamilton', country: 'NZ', lat: -37.7870, lon: 175.2793 },
    { name: 'Tauranga', country: 'NZ', lat: -37.6878, lon: 176.1651 },
    { name: 'Canberra', country: 'AU', state: 'Australian Capital Territory', lat: -35.2809, lon: 149.1300 },
    { name: 'Gold Coast', country: 'AU', state: 'Queensland', lat: -28.0167, lon: 153.4000 },
    { name: 'Newcastle', country: 'AU', state: 'New South Wales', lat: -32.9283, lon: 151.7817 },
    { name: 'Wollongong', country: 'AU', state: 'New South Wales', lat: -34.4278, lon: 150.8931 },
    { name: 'Hobart', country: 'AU', state: 'Tasmania', lat: -42.8821, lon: 147.3272 },
    { name: 'Darwin', country: 'AU', state: 'Northern Territory', lat: -12.4634, lon: 130.8456 },
    { name: 'Cairns', country: 'AU', state: 'Queensland', lat: -16.9186, lon: 145.7781 },
    { name: 'Townsville', country: 'AU', state: 'Queensland', lat: -19.2590, lon: 146.8169 },
    { name: 'Geelong', country: 'AU', state: 'Victoria', lat: -38.1499, lon: 144.3617 },
    { name: 'Ballarat', country: 'AU', state: 'Victoria', lat: -37.5622, lon: 143.8503 },
    { name: 'Bendigo', country: 'AU', state: 'Victoria', lat: -36.7570, lon: 144.2794 },
    { name: 'Albury', country: 'AU', state: 'New South Wales', lat: -36.0737, lon: 146.9135 },
    { name: 'Launceston', country: 'AU', state: 'Tasmania', lat: -41.4332, lon: 147.1441 },
    { name: 'Mackay', country: 'AU', state: 'Queensland', lat: -21.1550, lon: 149.1613 },
    { name: 'Rockhampton', country: 'AU', state: 'Queensland', lat: -23.3781, lon: 150.5069 },
    { name: 'Bunbury', country: 'AU', state: 'Western Australia', lat: -33.3267, lon: 115.6347 },
    { name: 'Bundaberg', country: 'AU', state: 'Queensland', lat: -24.8661, lon: 152.3489 },
    { name: 'Wagga Wagga', country: 'AU', state: 'New South Wales', lat: -35.1082, lon: 147.3598 },
    { name: 'Hervey Bay', country: 'AU', state: 'Queensland', lat: -25.2990, lon: 152.8526 },
    { name: 'Mildura', country: 'AU', state: 'Victoria', lat: -34.2087, lon: 142.1386 },
    { name: 'Shepparton', country: 'AU', state: 'Victoria', lat: -36.3820, lon: 145.3989 },
    { name: 'Gladstone', country: 'AU', state: 'Queensland', lat: -23.8449, lon: 151.2661 },
    { name: 'Tamworth', country: 'AU', state: 'New South Wales', lat: -31.0927, lon: 150.9279 },
    { name: 'Orange', country: 'AU', state: 'New South Wales', lat: -33.2839, lon: 149.0988 },
    { name: 'Dubbo', country: 'AU', state: 'New South Wales', lat: -32.2431, lon: 148.6017 },
    { name: 'Geraldton', country: 'AU', state: 'Western Australia', lat: -28.7774, lon: 114.6145 },
    { name: 'Kalgoorlie', country: 'AU', state: 'Western Australia', lat: -30.7333, lon: 121.4667 },
    { name: 'Port Macquarie', country: 'AU', state: 'New South Wales', lat: -31.4333, lon: 152.9000 },
    { name: 'Warrnambool', country: 'AU', state: 'Victoria', lat: -38.3833, lon: 142.4833 },
    { name: 'Rotorua', country: 'NZ', lat: -38.1368, lon: 176.2497 },
    { name: 'Palmerston North', country: 'NZ', lat: -40.3523, lon: 175.6082 },
    { name: 'Hastings', country: 'NZ', lat: -39.6381, lon: 176.8413 },
    { name: 'Nelson', country: 'NZ', lat: -41.2706, lon: 173.2840 },
    { name: 'Invercargill', country: 'NZ', lat: -46.4132, lon: 168.3538 },
    { name: 'Whangarei', country: 'NZ', lat: -35.7275, lon: 174.3166 },
    { name: 'New Plymouth', country: 'NZ', lat: -39.0579, lon: 174.0806 },
    { name: 'Napier', country: 'NZ', lat: -39.4928, lon: 176.9120 },
    { name: 'Porirua', country: 'NZ', lat: -41.1347, lon: 174.8404 },
    { name: 'Upper Hutt', country: 'NZ', lat: -41.1244, lon: 175.0707 },
    { name: 'Kapiti', country: 'NZ', lat: -40.9006, lon: 175.0373 },
    { name: 'Blenheim', country: 'NZ', lat: -41.5131, lon: 173.9545 },
    { name: 'Masterton', country: 'NZ', lat: -40.9597, lon: 175.6575 },
    { name: 'Levin', country: 'NZ', lat: -40.6214, lon: 175.2870 },
    { name: 'Timaru', country: 'NZ', lat: -44.3904, lon: 171.2373 },
    { name: 'Oamaru', country: 'NZ', lat: -45.0966, lon: 170.9714 },
    { name: 'Ashburton', country: 'NZ', lat: -43.9081, lon: 171.7300 },
    { name: 'Greymouth', country: 'NZ', lat: -42.4499, lon: 171.2079 },
    { name: 'Westport', country: 'NZ', lat: -41.7506, lon: 171.6026 },
    { name: 'Hokitika', country: 'NZ', lat: -42.7167, lon: 170.9667 },
    { name: 'Franz Josef', country: 'NZ', lat: -43.3833, lon: 170.1833 },
    { name: 'Queenstown', country: 'NZ', lat: -45.0312, lon: 168.6626 },
    { name: 'Wanaka', country: 'NZ', lat: -44.7000, lon: 169.1500 },
    { name: 'Te Anau', country: 'NZ', lat: -45.4167, lon: 167.7167 },
    { name: 'Suva', country: 'FJ', lat: -18.1248, lon: 178.4501 },
    { name: 'Nadi', country: 'FJ', lat: -17.7765, lon: 177.4162 },
    { name: 'Lautoka', country: 'FJ', lat: -17.6103, lon: 177.4570 },
    { name: 'Labasa', country: 'FJ', lat: -16.4333, lon: 179.3667 },
    { name: 'Savusavu', country: 'FJ', lat: -16.7833, lon: 179.3167 },
    { name: 'Sigatoka', country: 'FJ', lat: -18.1333, lon: 177.5000 },
    { name: 'Ba', country: 'FJ', lat: -17.5333, lon: 177.6667 },
    { name: 'Tavua', country: 'FJ', lat: -17.4667, lon: 177.8833 },
    { name: 'Rakiraki', country: 'FJ', lat: -17.3333, lon: 178.2333 },
    { name: 'Korovou', country: 'FJ', lat: -17.9167, lon: 178.3333 },
    { name: 'Levuka', country: 'FJ', lat: -17.6833, lon: 178.8333 },
    { name: 'Nausori', country: 'FJ', lat: -18.0333, lon: 178.5500 },
    { name: 'Navua', country: 'FJ', lat: -18.2333, lon: 178.1667 },
    { name: 'Deuba', country: 'FJ', lat: -18.3167, lon: 178.0833 },
    { name: 'Pacific Harbour', country: 'FJ', lat: -18.4000, lon: 178.2500 },
    { name: 'Apia', country: 'WS', lat: -13.8506, lon: -171.7513 },
    { name: 'Salelologa', country: 'WS', lat: -13.7333, lon: -172.1833 },
    { name: 'Mulifanua', country: 'WS', lat: -13.8333, lon: -172.0000 },
    { name: 'Leulumoega', country: 'WS', lat: -13.8167, lon: -171.8500 },
    { name: 'Lufilufi', country: 'WS', lat: -13.8667, lon: -171.5833 },
    { name: 'Falealupo', country: 'WS', lat: -13.5000, lon: -172.7833 },
    { name: 'Asau', country: 'WS', lat: -13.5333, lon: -172.6333 },
    { name: 'Safotulafai', country: 'WS', lat: -13.4333, lon: -172.4833 },
    { name: 'Satupaitea', country: 'WS', lat: -13.6500, lon: -172.3500 },
    { name: 'Palauli', country: 'WS', lat: -13.7500, lon: -172.2500 },
    { name: 'Saleaula', country: 'WS', lat: -13.6167, lon: -172.1833 },
    { name: 'Samauga', country: 'WS', lat: -13.7000, lon: -172.1000 },
    { name: 'Fagamalo', country: 'WS', lat: -13.7167, lon: -172.0833 },
    { name: 'Manono', country: 'WS', lat: -13.8167, lon: -172.0833 },
    { name: 'Apolima', country: 'WS', lat: -13.8000, lon: -172.1167 },
    { name: "Nuku'alofa", country: 'TO', lat: -21.1385, lon: -175.2206 },
    { name: 'Neiafu', country: 'TO', lat: -18.6500, lon: -173.9833 },
    { name: 'Pangai', country: 'TO', lat: -19.8167, lon: -174.3500 },
    { name: 'Ohonua', country: 'TO', lat: -21.3333, lon: -175.1833 },
    { name: 'Vaini', country: 'TO', lat: -21.2000, lon: -175.2000 },
    { name: 'Mu\'a', country: 'TO', lat: -21.1333, lon: -175.1500 },
    { name: 'Tatakamotonga', country: 'TO', lat: -21.1167, lon: -175.1833 },
    { name: 'Lapaha', country: 'TO', lat: -21.1500, lon: -175.1667 },
    { name: 'Niutoua', country: 'TO', lat: -21.1667, lon: -175.1500 },
    { name: 'Kolonga', country: 'TO', lat: -21.1000, lon: -175.0833 },
    { name: 'Haveluliku', country: 'TO', lat: -21.1833, lon: -175.1333 },
    { name: 'Holonga', country: 'TO', lat: -21.1500, lon: -175.1000 },
    { name: 'Kolofo\'ou', country: 'TO', lat: -21.1333, lon: -175.2167 },
    { name: 'Kolomotu\'a', country: 'TO', lat: -21.1333, lon: -175.2000 },
    { name: 'Ma\'ufanga', country: 'TO', lat: -21.1500, lon: -175.2167 },
    { name: 'Port Vila', country: 'VU', lat: -17.7334, lon: 168.3273 },
    { name: 'Luganville', country: 'VU', lat: -15.5167, lon: 167.1667 },
    { name: 'Isangel', country: 'VU', lat: -19.5500, lon: 169.2667 },
    { name: 'Sola', country: 'VU', lat: -13.8833, lon: 167.5500 },
    { name: 'Lenakel', country: 'VU', lat: -19.5333, lon: 169.2500 },
    { name: 'Lakatoro', country: 'VU', lat: -16.1000, lon: 167.4167 },
    { name: 'Norsup', country: 'VU', lat: -16.0667, lon: 167.4000 },
    { name: 'Saratamata', country: 'VU', lat: -15.2667, lon: 166.9833 },
    { name: 'Longana', country: 'VU', lat: -15.3000, lon: 167.8500 },
    { name: 'Loltong', country: 'VU', lat: -15.1000, lon: 167.7000 },
    { name: 'Port Olry', country: 'VU', lat: -15.0833, lon: 167.1167 },
    { name: 'Wala', country: 'VU', lat: -15.6833, lon: 167.3333 },
    { name: 'Rano', country: 'VU', lat: -15.5500, lon: 167.9500 },
    { name: 'Valesdir', country: 'VU', lat: -15.4000, lon: 167.8000 },
    { name: 'Redcliffe', country: 'VU', lat: -15.4667, lon: 167.8333 }
  ];
  
  const lowerQuery = query.toLowerCase();
  return globalCities.filter(city => 
    city.name.toLowerCase().includes(lowerQuery) ||
    city.country.toLowerCase().includes(lowerQuery) ||
    (city.state && city.state.toLowerCase().includes(lowerQuery))
  ).slice(0, 15);
};

const getDemoWeatherData = (lat: number, lon: number): WeatherResponse => {
  const now = new Date();
  const list = [];
  
  // Generate varied weather conditions for demo
  const conditions = [
    { main: 'Clear', description: 'clear sky', icon: '01d' },
    { main: 'Clouds', description: 'few clouds', icon: '02d' },
    { main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    { main: 'Rain', description: 'light rain', icon: '10d' },
    { main: 'Clouds', description: 'overcast clouds', icon: '04d' },
    { main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' },
    { main: 'Snow', description: 'light snow', icon: '13d' },
    { main: 'Mist', description: 'mist', icon: '50d' }
  ];
  
  for (let i = 0; i < 40; i++) {
    const date = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const baseTemp = 18 + Math.sin(i * 0.3) * 8; // Simulate daily temperature variation
    
    list.push({
      dt: Math.floor(date.getTime() / 1000),
      main: {
        temp: baseTemp + (Math.random() - 0.5) * 4,
        feels_like: baseTemp + (Math.random() - 0.5) * 4 + 2,
        temp_min: baseTemp - 3 + (Math.random() - 0.5) * 2,
        temp_max: baseTemp + 5 + (Math.random() - 0.5) * 2,
        pressure: 1013 + Math.random() * 20 - 10,
        humidity: 45 + Math.random() * 40
      },
      weather: [{
        id: 800,
        main: condition.main,
        description: condition.description,
        icon: condition.icon
      }],
      clouds: { all: Math.random() * 100 },
      wind: {
        speed: Math.random() * 8 + 1,
        deg: Math.random() * 360
      },
      visibility: 8000 + Math.random() * 4000,
      pop: condition.main === 'Rain' ? 0.6 + Math.random() * 0.3 : Math.random() * 0.2,
      dt_txt: date.toISOString().replace('T', ' ').slice(0, 19),
      rain: condition.main === 'Rain' ? { '3h': Math.random() * 3 } : undefined,
      snow: condition.main === 'Snow' ? { '3h': Math.random() * 2 } : undefined
    });
  }
  
  return {
    cod: '200',
    message: 0,
    cnt: 40,
    list,
    city: {
      id: 1,
      name: 'Demo City',
      coord: { lat, lon },
      country: 'XX',
      population: 1000000,
      timezone: 0,
      sunrise: Math.floor(Date.now() / 1000),
      sunset: Math.floor(Date.now() / 1000) + 12 * 3600
    }
  };
};