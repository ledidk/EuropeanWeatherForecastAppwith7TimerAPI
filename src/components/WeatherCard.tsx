import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Cloud, 
  CloudRain,
  Sun,
  CloudSnow,
  Eye,
  Gauge,
  Navigation
} from 'lucide-react';
import { ProcessedWeatherData } from '../types/weather';
import { getWeatherIcon } from '../utils/weatherApi';

interface WeatherCardProps {
  weather: ProcessedWeatherData;
  isToday?: boolean;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather, isToday = false }) => {
  const getLucideIcon = () => {
    switch (weather.condition.toLowerCase()) {
      case 'clear':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="w-8 h-8 text-gray-400" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-8 h-8 text-blue-300" />;
      case 'thunderstorm':
        return <CloudRain className="w-8 h-8 text-purple-500" />;
      default:
        return <Sun className="w-8 h-8 text-yellow-400" />;
    }
  };

  const getBackgroundGradient = () => {
    if (isToday) {
      switch (weather.condition.toLowerCase()) {
        case 'clear':
          return 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400';
        case 'rain':
        case 'drizzle':
          return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
        case 'snow':
          return 'bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400';
        case 'thunderstorm':
          return 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600';
        case 'clouds':
          return 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
        default:
          return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
      }
    }
    return 'bg-white';
  };

  const getTextColor = () => {
    return isToday ? 'text-white' : 'text-gray-800';
  };

  const getSecondaryTextColor = () => {
    return isToday ? 'text-white/90' : 'text-gray-600';
  };

  const formatDate = () => {
    const date = new Date(weather.date);
    return `${date.toString().slice(0, 3)} ${date.toString().slice(4, 7)} ${date.getDate()}`;
  };

  return (
    <div className={`
      ${isToday ? 'col-span-full lg:col-span-2' : ''} 
      ${getBackgroundGradient()} 
      ${isToday ? '' : 'bg-white/80 backdrop-blur-sm'} 
      rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border 
      ${isToday ? 'border-transparent' : 'border-gray-200'}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${getTextColor()}`}>
            {isToday ? 'Today' : weather.dayOfWeek}
          </h3>
          <p className={`text-sm ${getSecondaryTextColor()}`}>
            {formatDate()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getLucideIcon()}
          <span className="text-2xl">{getWeatherIcon(weather.icon)}</span>
        </div>
      </div>

      {/* Temperature */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${getTextColor()}`}>
            {weather.temperature}°C
          </span>
          {!isToday && (
            <span className={`text-lg ${getSecondaryTextColor()}`}>
              {weather.tempMin}°/{weather.tempMax}°
            </span>
          )}
        </div>
        <p className={`text-sm ${getSecondaryTextColor()} mt-1 capitalize`}>
          {weather.description}
        </p>
      </div>

      {/* Weather Details */}
      <div className={`grid ${isToday ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'} gap-4`}>
        <div className="flex items-center gap-2">
          <Droplets className={`w-4 h-4 ${isToday ? 'text-white/80' : 'text-blue-500'}`} />
          <div>
            <p className={`text-xs ${getSecondaryTextColor()}`}>Humidity</p>
            <p className={`text-sm font-medium ${getTextColor()}`}>{weather.humidity}%</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${isToday ? 'text-white/80' : 'text-gray-500'}`} />
          <div>
            <p className={`text-xs ${getSecondaryTextColor()}`}>Wind</p>
            <p className={`text-sm font-medium ${getTextColor()}`}>
              {weather.windSpeed} km/h {weather.windDirection}
            </p>
          </div>
        </div>

        {isToday && (
          <>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-white/80" />
              <div>
                <p className="text-xs text-white/90">Pressure</p>
                <p className="text-sm font-medium text-white">{weather.pressure} hPa</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white/80" />
              <div>
                <p className="text-xs text-white/90">Visibility</p>
                <p className="text-sm font-medium text-white">{weather.visibility} km</p>
              </div>
            </div>
          </>
        )}

        {weather.precipitation > 0 && (
          <div className="flex items-center gap-2 col-span-2">
            <CloudRain className={`w-4 h-4 ${isToday ? 'text-white/80' : 'text-blue-500'}`} />
            <div>
              <p className={`text-xs ${getSecondaryTextColor()}`}>Precipitation</p>
              <p className={`text-sm font-medium ${getTextColor()}`}>
                {weather.precipitation.toFixed(1)}mm ({weather.precipitationType})
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherCard;