<?php
/**
 * OpenAI Realtime API Ephemeral Key Generator
 * Place this file next to chat.php in the same directory
 */

// ✅ FIX: JSON float precision (prevents 0.8 → 0.7999999... issue)
ini_set('serialize_precision', -1);
ini_set('precision', 14);

// CORS engedélyezése
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflight request kezelése
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rate limiting - IP alapú
session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$rate_limit_key = 'rate_limit_realtime_' . md5($ip);
$max_requests = 10; // Max 10 voice session / óra (költséges!)
$time_window = 3600; // 1 óra

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'start_time' => time()];
}

$rate_data = $_SESSION[$rate_limit_key];

// Időablak lejárt? Reseteljük
if (time() - $rate_data['start_time'] > $time_window) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'start_time' => time()];
    $rate_data = $_SESSION[$rate_limit_key];
}

// Rate limit ellenőrzés
/* if ($rate_data['count'] >= $max_requests) {
    http_response_code(429);
    echo json_encode([
        'error' => [
            'message' => 'Voice session limit exceeded. Try again later.',
            'type' => 'rate_limit_error'
        ]
    ]);
    exit;
} */

// Növeljük a számlálót
$_SESSION[$rate_limit_key]['count']++;

// Egyszerű .env fájl beolvasása (ugyanaz mint chat.php-ban)
/* function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception('.env file not found');
    }
    $env = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($env as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Betöltjük a .env fájlt
loadEnv(__DIR__ . '/.env');
$apiKey = $_ENV['OPENAI_API_KEY'] ?? null;

if (!$apiKey) {
    http_response_code(500);
    echo json_encode([
        'error' => [
            'message' => 'API key not configured',
            'type' => 'configuration_error'
        ]
    ]);
    exit;
} */

// ✅ ÚJ: API KULCS KINYERÉSE A FEJLÉCBŐL
/* $headers = getallheaders();
$authHeader = $headers['Authorization'] ?? ''; */
$authHeader = null;
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) { // Apache specifikus fallback
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

if ($authHeader && preg_match('/^Bearer\s+(sk-[a-zA-Z0-9_\-]{20,})$/', $authHeader, $matches)) {
    $apiKey = $matches[1];
} else {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API key is missing or invalid.', 'type' => 'auth_error']]);
    exit;
}    

try {
    // Kérés payload olvasása
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // JSON ellenőrzése
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON input: " . json_last_error_msg());
    }
    $model_short = $data['model'] ?? 'gpt-realtime-mini';
    // Input paraméterek (opcionális értékekkel)
    $model_map = [
        'gpt-realtime-mini' => 'gpt-realtime-mini',
        'gpt-realtime' => 'gpt-realtime'
    ];
    $model = $model_map[$model_short] ?? 'gpt-realtime-mini'; // Alapértelmezett a mini
    $voice = $data['voice'] ?? 'alloy';
    
    // Add current date and time to instructions
    date_default_timezone_set('Europe/Budapest');
    $currentDateTime = date('Y.m.d. H:i:s');
    
    $instructions = $data['instructions'] ?? "Current date and time: {$currentDateTime}. You are a helpful assistant on a Nokai phone. Keep responses concise and friendly. IMPORTANT: The user primarily speaks Hungarian (magyar nyelv). If you detect Hungarian speech, the transcription should also be in Hungarian. Always respond in the same language the user is speaking.";
    
    // Támogatott hangok whitelist - ALL OpenAI voices
    $allowed_voices = ['alloy', 'echo', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse', 'fable', 'onyx', 'nova'];
    if (!in_array($voice, $allowed_voices)) {
        $voice = 'echo'; // Default to echo if invalid
    }
    
    // API hívás payload az OpenAI Realtime Sessions endpoint-hoz
    $apiPayload = [
        'model' => $model,
        'voice' => $voice,
        'modalities' => ['text', 'audio'], // Explicitly enable both
        'instructions' => $instructions,
        'input_audio_transcription' => [
            'model' => 'whisper-1'
        ],
        'turn_detection' => [
            'type' => 'server_vad',
            // Longer silence threshold for better language detection
            'threshold' => 0.5,              // Default: 0.5 (voice activity sensitivity)
            'prefix_padding_ms' => 300,      // Audio before speech starts
            'silence_duration_ms' => 500     // Wait 500ms of silence before processing
        ],
        'temperature' => 0.8,  // Slightly lower for more consistent transcriptions
        'max_response_output_tokens' => 4096
    ];
    
    $apiPayloadJson = json_encode($apiPayload);
    
    // cURL használata a jobb hibakezelés miatt
    $ch = curl_init('https://api.openai.com/v1/realtime/sessions');
    
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $apiPayloadJson,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $apiResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    curl_close($ch);
    
    // Hibakezelés
    if ($curlError) {
        throw new Exception("Failed to connect to OpenAI: " . $curlError);
    }
    
    if ($httpCode !== 200) {
        // OpenAI API hiba továbbítása
        http_response_code($httpCode);
        echo $apiResponse;
        exit;
    }
    
    // Sikeres válasz
    echo $apiResponse;
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => [
            'message' => $e->getMessage(),
            'type' => 'server_error'
        ]
    ]);
}
?>
