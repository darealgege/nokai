<?php
/**
 * Weather Data Provider
 * Uses Open-Meteo API (free, no API key needed)
 * https://open-meteo.com/
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

// Preflight request kezelése
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rate limiting
session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$rate_limit_key = 'rate_limit_weather_' . md5($ip);
$max_requests = 60; // Max 60 request per hour
$time_window = 3600;

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'start_time' => time()];
}

$rate_data = $_SESSION[$rate_limit_key];

if (time() - $rate_data['start_time'] > $time_window) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'start_time' => time()];
    $rate_data = $_SESSION[$rate_limit_key];
}

if ($rate_data['count'] >= $max_requests) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Rate limit exceeded',
        'message' => 'Too many weather requests. Try again later.'
    ]);
    exit;
}

$_SESSION[$rate_limit_key]['count']++;

try {
    // Get input parameters
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE && $_SERVER['REQUEST_METHOD'] === 'POST') {
        throw new Exception("Invalid JSON input");
    }
    
    // Get coordinates (from POST or GET)
    $latitude = $data['latitude'] ?? $_GET['latitude'] ?? null;
    $longitude = $data['longitude'] ?? $_GET['longitude'] ?? null;
    
    // Get location name (optional, for geocoding)
    $location = $data['location'] ?? $_GET['location'] ?? null;
    
    // If no coordinates but location name provided, geocode it
    if ((!$latitude || !$longitude) && $location) {
        $geocode_url = 'https://geocoding-api.open-meteo.com/v1/search?name=' . urlencode($location) . '&count=1&language=hu&format=json';
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10
            ]
        ]);
        
        $geocode_response = @file_get_contents($geocode_url, false, $context);
        
        if ($geocode_response === FALSE) {
            throw new Exception("Failed to geocode location");
        }
        
        $geocode_data = json_decode($geocode_response, true);
        
        if (empty($geocode_data['results'])) {
            throw new Exception("Location not found: " . $location);
        }
        
        $latitude = $geocode_data['results'][0]['latitude'];
        $longitude = $geocode_data['results'][0]['longitude'];
        $location_name = $geocode_data['results'][0]['name'];
        $country = $geocode_data['results'][0]['country'] ?? '';
    }
    
    // Validate coordinates
    if (!$latitude || !$longitude) {
        throw new Exception("Missing coordinates. Please provide latitude/longitude or location name.");
    }
    
    // Validate coordinate ranges
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        throw new Exception("Invalid coordinates");
    }
    
    // Build Open-Meteo API URL
    $weather_params = [
        'latitude' => $latitude,
        'longitude' => $longitude,
        'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
        'timezone' => 'auto',
        'forecast_days' => 1
    ];
    
    $weather_url = 'https://api.open-meteo.com/v1/forecast?' . http_build_query($weather_params);
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 10
        ]
    ]);
    
    $weather_response = @file_get_contents($weather_url, false, $context);
    
    if ($weather_response === FALSE) {
        throw new Exception("Failed to fetch weather data");
    }
    
    $weather_data = json_decode($weather_response, true);
    
    if (!isset($weather_data['current'])) {
        throw new Exception("Invalid weather data received");
    }
    
    // Parse weather data
    $current = $weather_data['current'];
    
    // Weather code to description (WMO codes)
    $weather_codes = [
        0 => 'tiszta ég',
        1 => 'túlnyomóan tiszta',
        2 => 'részben felhős',
        3 => 'borult',
        45 => 'ködös',
        48 => 'zúzmarás köd',
        51 => 'könnyű szitálás',
        53 => 'mérsékelt szitálás',
        55 => 'erős szitálás',
        61 => 'enyhe eső',
        63 => 'mérsékelt eső',
        65 => 'erős eső',
        71 => 'enyhe havazás',
        73 => 'mérsékelt havazás',
        75 => 'erős havazás',
        77 => 'szemcsés hó',
        80 => 'enyhe zápor',
        81 => 'mérsékelt zápor',
        82 => 'heves zápor',
        85 => 'enyhe hózápor',
        86 => 'erős hózápor',
        95 => 'zivatar',
        96 => 'zivatar jégesővel',
        99 => 'erős zivatar jégesővel'
    ];
    
    $weather_code = $current['weather_code'] ?? 0;
    $weather_description = $weather_codes[$weather_code] ?? 'ismeretlen';
    
    // Wind direction
    $wind_direction = $current['wind_direction_10m'] ?? 0;
    $wind_directions = ['É', 'ÉK', 'K', 'DK', 'D', 'DNY', 'NY', 'ÉNY'];
    $wind_dir_text = $wind_directions[round($wind_direction / 45) % 8];
    
    // Format response
    $response = [
        'success' => true,
        'location' => [
            'name' => $location_name ?? 'Ismeretlen',
            'country' => $country ?? '',
            'latitude' => $latitude,
            'longitude' => $longitude,
            'timezone' => $weather_data['timezone'] ?? 'UTC'
        ],
        'current' => [
            'time' => $current['time'] ?? date('Y-m-d H:i'),
            'temperature' => round($current['temperature_2m'] ?? 0, 1),
            'feels_like' => round($current['apparent_temperature'] ?? 0, 1),
            'humidity' => $current['relative_humidity_2m'] ?? 0,
            'precipitation' => $current['precipitation'] ?? 0,
            'wind_speed' => round($current['wind_speed_10m'] ?? 0, 1),
            'wind_direction' => $wind_dir_text,
            'weather_code' => $weather_code,
            'weather_description' => $weather_description
        ],
        'summary' => sprintf(
            "%s, hőmérséklet: %.1f°C (érzetben: %.1f°C), páratartalom: %d%%, szél: %s %.1f km/h",
            ucfirst($weather_description),
            $current['temperature_2m'] ?? 0,
            $current['apparent_temperature'] ?? 0,
            $current['relative_humidity_2m'] ?? 0,
            $wind_dir_text,
            $current['wind_speed_10m'] ?? 0
        ),
        // AI-friendly context string
        'context' => sprintf(
            "Weather in %s: %s, temperature %.1f°C (feels like %.1f°C), humidity %d%%, wind from %s at %.1f km/h%s",
            $location_name ?? 'location',
            $weather_description,
            $current['temperature_2m'] ?? 0,
            $current['apparent_temperature'] ?? 0,
            $current['relative_humidity_2m'] ?? 0,
            $wind_dir_text,
            $current['wind_speed_10m'] ?? 0,
            ($current['precipitation'] ?? 0) > 0 ? sprintf(', precipitation %.1fmm', $current['precipitation']) : ''
        )
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
