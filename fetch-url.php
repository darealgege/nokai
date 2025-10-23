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

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['url'])) {
        throw new Exception('Missing URL parameter');
    }
    
    $url = $data['url'];
    
    // Validate URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        throw new Exception('Invalid URL format: ' . $url);
    }
    
    // Use cURL for better compatibility and error handling
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 10, // Shorter timeout to prevent hanging
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_ENCODING => '', // Handle gzip/deflate
        CURLOPT_SSL_VERIFYPEER => false, // Some sites have SSL issues
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.9,hu;q=0.8',
            'Cache-Control: no-cache'
        ]
    ]);
    
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    
    // Check for cURL errors
    if ($html === FALSE || !empty($curlError)) {
        throw new Exception('Failed to fetch URL: ' . $curlError);
    }
    
    // Check HTTP status
    if ($httpCode >= 400) {
        throw new Exception('HTTP error ' . $httpCode . ' when fetching URL');
    }
    
    // Check if content is HTML (skip PDFs, images, etc.)
    if ($contentType && !preg_match('/html|text/', $contentType)) {
        throw new Exception('Unsupported content type: ' . $contentType);
    }
    
    // Simple HTML to text conversion
    $text = strip_tags($html);
    
    // Clean up whitespace
    $text = preg_replace('/\s+/', ' ', $text);
    $text = trim($text);
    
    // Remove empty lines and excessive whitespace
    $text = preg_replace('/\n\s*\n/', "\n", $text);
    
    // Limit content length
    $maxLength = 8000;
    if (strlen($text) > $maxLength) {
        $text = substr($text, 0, $maxLength) . '... [truncated]';
    }
    
    // Check if we got any meaningful content
    if (strlen($text) < 50) {
        throw new Exception('Content too short or empty from URL');
    }
    
    echo json_encode([
        'success' => true,
        'url' => $url,
        'content' => $text,
        'length' => strlen($text),
        'http_code' => $httpCode
    ]);
    
} catch (Exception $e) {
    // Return error but don't fail the whole search
    // Just log it and return empty content
    http_response_code(200); // Changed to 200 so it doesn't break the search
    echo json_encode([
        'success' => false,
        'url' => $url ?? 'unknown',
        'error' => $e->getMessage(),
        'content' => '' // Empty content instead of failing
    ]);
}
?>
