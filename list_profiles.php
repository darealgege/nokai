<?php
// List all .ini files in the profiles directory

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$profilesDir = __DIR__ . '/profiles';

// Check if directory exists
if (!is_dir($profilesDir)) {
    http_response_code(404);
    echo json_encode(['error' => 'Profiles directory not found']);
    exit;
}

// Get all .ini files
$files = glob($profilesDir . '/*.ini');

// Extract just the filenames (not full paths)
$profileFiles = array_map(function($file) {
    return basename($file);
}, $files);

// Sort alphabetically
sort($profileFiles);

// Return as JSON
echo json_encode($profileFiles);
?>
