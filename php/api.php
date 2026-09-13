<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Content-Security-Policy: default-src \'none\'; frame-ancestors \'none\';');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$mode = $_GET['mode'] ?? 'status';

if ($mode === 'time') {
    $timestamp = time();
    $timezone = 'Asia/Kolkata';

    // Google publishes a trusted HTTPS Date header. Prefer it when PHP URL streams are enabled.
    $context = stream_context_create([
        'http' => [
            'method' => 'HEAD',
            'timeout' => 3,
            'ignore_errors' => true,
            'header' => "User-Agent: MJ-Website-Time/1.0\r\nConnection: close\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $headers = @get_headers('https://www.google.com/generate_204', true, $context);
    if (is_array($headers)) {
        $dateHeader = $headers['Date'] ?? null;
        if (is_array($dateHeader)) $dateHeader = end($dateHeader);
        if (is_string($dateHeader)) {
            $googleTime = strtotime($dateHeader);
            if ($googleTime !== false) $timestamp = $googleTime;
        }
    }

    $dt = new DateTimeImmutable('@' . $timestamp);
    $dt = $dt->setTimezone(new DateTimeZone($timezone));

    echo json_encode([
        'success' => true,
        'timestamp_ms' => $timestamp * 1000,
        'timezone' => $timezone,
        'formatted' => $dt->format('d M Y · H:i:s'),
        'source' => 'Google HTTPS Date with server fallback'
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode(['success' => true, 'service' => 'MJ PHP API']);
