<?php
// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load environment variables from .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception('.env file not found at: ' . $path);
    }
    $env = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($env as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Try to load .env from the same directory as this PHP file
try {
    loadEnv(__DIR__ . '/.env');
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration error: ' . $e->getMessage()]);
    exit;
}

$braveApiKey = $_ENV['BRAVE_API_KEY'] ?? null;

if (!$braveApiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'BRAVE_API_KEY not configured in .env']);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['query'])) {
        throw new Exception('Missing query parameter');
    }
    
    $query = $data['query'];
    $searchUrl = 'https://api.search.brave.com/res/v1/web/search?q=' . urlencode($query) . '&extra_snippets=true';
    
    // Use cURL with proper gzip handling
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $searchUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_ENCODING => '', // Enable all supported encodings (including gzip)
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'X-Subscription-Token: ' . $braveApiKey
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === FALSE || !empty($curlError)) {
        throw new Exception('Brave API request failed: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        throw new Exception('Brave API returned status ' . $httpCode);
    }
    
    // Verify JSON is valid before sending
    $decoded = json_decode($response);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON from Brave API: ' . json_last_error_msg());
    }
    
    echo $response;
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'query' => $query ?? 'N/A'
    ]);
}
?>
