export interface City {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  timezone?: string;
}

export interface WeatherDataPoint {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  pop: number;
  rain?: {
    '3h': number;
  };
  snow?: {
    '3h': number;
  };
  dt_txt: string;
}

export interface WeatherResponse {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherDataPoint[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface ProcessedWeatherData {
  date: string;
  dayOfWeek: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  precipitationType: string;
  cloudCover: number;
  icon: string;
  pressure: number;
  visibility: number;
}

export interface GeocodingResult {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}