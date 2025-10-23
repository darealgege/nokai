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

$perplexityApiKey = $_ENV['PERPLEXITY_API_KEY'] ?? null;

if (!$perplexityApiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'PERPLEXITY_API_KEY not configured in .env']);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['query'])) {
        throw new Exception('Missing query parameter');
    }
    
    $query = $data['query'];
    
    $payload = [
        'model' => 'sonar',
        'messages' => [
            [
                'role' => 'user',
                'content' => $query
            ]
        ],
        'max_tokens' => 4096,
        'temperature' => 0.2,
        'top_p' => 0.9,
        'return_citations' => true,
        'stream' => false
    ];
    
    // Use cURL for better error handling
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://api.perplexity.ai/chat/completions',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $perplexityApiKey
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === FALSE || !empty($curlError)) {
        throw new Exception('Perplexity API request failed: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        throw new Exception('Perplexity API returned status ' . $httpCode . ': ' . substr($response, 0, 200));
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
