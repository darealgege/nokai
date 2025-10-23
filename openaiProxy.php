<?php
// CORS engedélyezése
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Preflight request kezelése
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rate limiting - IP alapú
session_start();
$ip = $_SERVER['REMOTE_ADDR'];
$rate_limit_key = 'rate_limit_' . md5($ip);
$max_requests = 20; // Max 20 kérés
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
if ($rate_data['count'] >= $max_requests) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded. Try again later.']);
    exit;
}

// Növeljük a számlálót
$_SESSION[$rate_limit_key]['count']++;

// Egyszerű .env fájl beolvasása
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
    echo json_encode(['error' => 'API key not configured']);
    exit;
}*/

// ✅ ÚJ: API KULCS KINYERÉSE A FEJLÉCBŐL
/* $headers = getallheaders();
$authHeader = $headers['Authorization'] ?? ''; */
$authHeader = null;
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) { // Apache specifikus fallback
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

if ($authHeader && preg_match('/^Bearer\s+(sk-[a-zA-Z0-9]{20,})$/', $authHeader, $matches)) {
    $apiKey = $matches[1];
} else {
    http_response_code(401);
    // A hibaüzenet formátuma eltérő a két fájlban, azt hagyd változatlanul
    // openaiProxy.php:
    echo json_encode(['error' => 'API key is missing or invalid.']);
    // realtime-session.php:
    // echo json_encode(['error' => ['message' => 'API key is missing or invalid.', 'type' => 'auth_error']]);
    exit;
}
if (preg_match('/^Bearer\s+(sk-[a-zA-Z0-9]{20,})$/', $authHeader, $matches)) {
    $apiKey = $matches[1];
} else {
    http_response_code(401);
    echo json_encode(['error' => 'API key is missing or invalid.']);
    exit;
}    

$response = ['error' => null];

try {
    // Kérés payload olvasása
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON input: " . json_last_error_msg());
    }
    
    if (!isset($data['messages']) || !is_array($data['messages'])) {
        throw new Exception("Invalid messages format");
    }
    
    $messages = $data['messages'];
    $model = $data['model'] ?? 'gpt-4.1-nano';
    
    $allowed_models = ['gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.1'];
    if (!in_array($model, $allowed_models)) {
        $model = 'gpt-4.1-nano';
    }
    
    $temperature = floatval($data['temperature'] ?? 0.7);
    $temperature = max(0, min(2, $temperature));
    
    $apiPayload = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => $temperature,
        'max_tokens' => 1024
    ];
    
    // ✅ JAVÍTÁS: cURL használata a file_get_contents helyett
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($apiPayload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    $apiResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("API request failed: " . $curlError);
    }

    if ($httpCode >= 400) {
        // Próbáljuk dekódolni az OpenAI hibaüzenetét
        $errorBody = json_decode($apiResponse, true);
        $errorMessage = $errorBody['error']['message'] ?? $apiResponse;
        throw new Exception("API error (HTTP {$httpCode}): " . $errorMessage);
    }
    
    echo $apiResponse;
    
} catch (Exception $e) {
    http_response_code(400);
    // A hibaüzenetet most már egy 'error' objektumba csomagoljuk a konzisztencia érdekében
    echo json_encode(['error' => ['message' => $e->getMessage()]]);
}
?>