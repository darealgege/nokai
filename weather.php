<?php
/**
 * Fejlett Időjárás Szolgáltató
 * - Pontos címfordítás: OpenStreetMap/Nominatim
 * - Részletes időjárási adatok: Open-Meteo
 * - Rate limit védelem
 */

// ✅ FIX: JSON float precision (prevents excessive decimal places)
ini_set('serialize_precision', -1);
ini_set('precision', 14);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

// Preflight (CORS) kérés kezelése
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- Rate Limiting (Saját szerver védelme) ---
session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$rate_limit_key = 'rate_limit_weather_' . md5($ip);
$max_requests = 60; // Max 60 kérés óránként egy IP-ről
$time_window = 3600; // 1 óra

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'start_time' => time()];
}

$rate_data = $_SESSION[$rate_limit_key];

/* if (time() - $rate_data['start_time'] > $time_window) {
    // Ha lejárt az időablak, nullázzuk
    $_SESSION[$rate_limit_key] = ['count' => 1, 'start_time' => time()];
} elseif ($rate_data['count'] >= $max_requests) {
    // Ha a limitet elértük az időablakon belül
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Rate limit exceeded. Please try again later.']);
    exit;
} else {
    // Növeljük a számlálót
    $_SESSION[$rate_limit_key]['count']++;
} */

try {
    // --- Bemeneti adatok fogadása ---
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE && $_SERVER['REQUEST_METHOD'] === 'POST') {
        throw new Exception("Invalid JSON input");
    }
    
    $latitude = $data['latitude'] ?? $_GET['latitude'] ?? null;
    $longitude = $data['longitude'] ?? $_GET['longitude'] ?? null;
    
    if (!$latitude || !$longitude) {
        throw new Exception("Missing coordinates");
    }
    
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        throw new Exception("Invalid coordinates");
    }

    // --- 1. LÉPÉS: Pontos cím lekérdezése (Nominatim) ---
    $location_name = 'Ismeretlen hely';
    $country = '';
    $full_address = '';

    $nominatim_url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$latitude}&lon={$longitude}&accept-language=hu";
    
    // FONTOS: A Nominatim megköveteli az egyedi User-Agent fejlécet!
    $ch_geo = curl_init($nominatim_url);
    curl_setopt_array($ch_geo, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Nokia3310App/1.0',
            'Accept: application/json'
        ]
    ]);
    $geocode_response = curl_exec($ch_geo);
    $geo_curl_error = curl_error($ch_geo);
    curl_close($ch_geo);
    
    if ($geo_curl_error) {
        $geocode_response = FALSE;
    }

    if ($geocode_response !== FALSE) {
        $geocode_data = json_decode($geocode_response, true);
        if (isset($geocode_data['address'])) {
            $addr = $geocode_data['address'];
            
            $location_name = $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['county'] ?? 'Ismeretlen';
            $country = $addr['country'] ?? '';

            // Robusztus címépítés
            $address_parts = [];
            $city_part = $addr['postcode'] ?? '';
            if (!empty($location_name) && $location_name !== 'Ismeretlen') {
                $city_part .= ($city_part ? ' ' : '') . $location_name;
            }
            if ($city_part) $address_parts[] = $city_part;

            $street_part = $addr['road'] ?? '';
            if (!empty($addr['house_number'])) {
                $street_part .= ($street_part ? ' ' : '') . $addr['house_number'];
            }
            if ($street_part) $address_parts[] = $street_part;

            $full_address = implode(', ', $address_parts);
        }
    }

    // --- 2. LÉPÉS: Részletes időjárás lekérdezése (Open-Meteo) ---
    $weather_params = [
        'latitude' => $latitude,
        'longitude' => $longitude,
        'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
        'timezone' => 'auto',
        'forecast_days' => 1
    ];
    
    $weather_url = 'https://api.open-meteo.com/v1/forecast?' . http_build_query($weather_params);
    
    // cURL használata file_get_contents helyett (megbízhatóbb shared hostingon)
    $ch_weather = curl_init($weather_url);
    curl_setopt_array($ch_weather, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json']
    ]);
    $weather_response = curl_exec($ch_weather);
    $weather_http_code = curl_getinfo($ch_weather, CURLINFO_HTTP_CODE);
    $weather_curl_error = curl_error($ch_weather);
    curl_close($ch_weather);
    
    if ($weather_response === FALSE || $weather_curl_error) {
        throw new Exception("Failed to fetch weather data: " . ($weather_curl_error ?: 'Unknown error'));
    }
    
    if ($weather_http_code >= 400) {
        throw new Exception("Weather API returned HTTP {$weather_http_code}");
    }
    
    $weather_data = json_decode($weather_response, true);
    
    if (!isset($weather_data['current'])) {
        throw new Exception("Invalid weather data received");
    }
    
    $current = $weather_data['current'];
    
    $weather_codes = [
        0 => 'tiszta ég', 1 => 'túlnyomóan tiszta', 2 => 'részben felhős', 3 => 'borult', 45 => 'ködös', 48 => 'zúzmarás köd',
        51 => 'könnyű szitálás', 53 => 'mérsékelt szitálás', 55 => 'erős szitálás', 61 => 'enyhe eső', 63 => 'mérsékelt eső',
        65 => 'erős eső', 71 => 'enyhe havazás', 73 => 'mérsékelt havazás', 75 => 'erős havazás', 77 => 'szemcsés hó',
        80 => 'enyhe zápor', 81 => 'mérsékelt zápor', 82 => 'heves zápor', 85 => 'enyhe hózápor', 86 => 'erős hózápor',
        95 => 'zivatar', 96 => 'zivatar jégesővel', 99 => 'erős zivatar jégesővel'
    ];
    
    $weather_code = $current['weather_code'] ?? 0;
    $weather_description = $weather_codes[$weather_code] ?? 'ismeretlen';
    
    $wind_direction = $current['wind_direction_10m'] ?? 0;
    $wind_directions = ['É', 'ÉK', 'K', 'DK', 'D', 'DNY', 'NY', 'ÉNY'];
    $wind_dir_text = $wind_directions[round($wind_direction / 45) % 8];
    
    // --- 3. LÉPÉS: Válasz összeállítása ---
    $response = [
        'success' => true,
        'location' => [
            'name' => $location_name,
            'country' => $country,
            'full_address' => $full_address ?: 'Pontos cím nem található',
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
            'wind_gusts' => round($current['wind_gusts_10m'] ?? 0, 1),
            'wind_direction' => $wind_dir_text,
            'weather_code' => $weather_code,
            'weather_description' => $weather_description,
            'is_day' => $current['is_day'] ?? 1,
            'cloud_cover' => $current['cloud_cover'] ?? 0,
            'pressure_msl' => round($current['pressure_msl'] ?? 0, 1),
            'uv_index' => round($current['uv_index'] ?? 0, 1)
        ],
        'context' => sprintf(
            "Weather at %s: %s, temperature %.1f°C (feels like %.1f°C), humidity %d%%, wind from %s at %.1f km/h with gusts up to %.1f km/h, pressure %d hPa, UV index is %.1f.%s",
            $full_address ?: $location_name,
            $weather_description,
            $current['temperature_2m'] ?? 0,
            $current['apparent_temperature'] ?? 0,
            $current['relative_humidity_2m'] ?? 0,
            $wind_dir_text,
            $current['wind_speed_10m'] ?? 0,
            $current['wind_gusts_10m'] ?? 0,
            round($current['pressure_msl'] ?? 0),
            $current['uv_index'] ?? 0,
            ($current['precipitation'] ?? 0) > 0 ? sprintf(' Precipitation: %.1fmm.', $current['precipitation']) : ''
        )
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>