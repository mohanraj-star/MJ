<?php
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uri = rawurldecode($uri);

// Never expose private message storage.
if (str_starts_with($uri, '/php/data') || str_contains($uri, '..')) {
    http_response_code(404); echo '404 Not Found'; return true;
}

// Same-origin bridge: browser -> PHP router -> local Flask API.
if ($uri === '/api/skills' || $uri === '/api/health') {
    $target = 'http://127.0.0.1:5000' . $uri;
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 3,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nConnection: close\r\n",
        ],
    ]);
    $body = @file_get_contents($target, false, $context);
    if ($body === false) { http_response_code(503); header('Content-Type: application/json'); echo json_encode(['success'=>false,'message'=>'Python API is offline.']); return true; }
    $code = 200;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $code = (int)$m[1];
    http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo $body; return true;
}

$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if ($ext === 'json' || $ext === 'py' || $ext === 'bat' || $ext === 'ps1') { http_response_code(404); echo '404 Not Found'; return true; }
    return false;
}

if ($uri === '/' || $uri === '/index.html') { readfile(__DIR__ . '/index.html'); return true; }
http_response_code(404); echo '404 Not Found'; return true;
