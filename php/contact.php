<?php
declare(strict_types=1);

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; form-action 'self';");

function respond(int $status, array $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['mode'] ?? '') === 'token') {
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    respond(200, ['success' => true, 'csrf_token' => $_SESSION['csrf_token']]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['success' => false, 'message' => 'Method not allowed']);

$token = (string)($_POST['csrf_token'] ?? '');
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) respond(403, ['success' => false, 'message' => 'Security check failed. Refresh the page and try again.']);

$name = trim((string)($_POST['name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));

if ($name === '' || $email === '' || $message === '') respond(400, ['success' => false, 'message' => 'All fields are required.']);
if (strlen($name) > 80 || strlen($email) > 160 || strlen($message) > 2000) respond(400, ['success' => false, 'message' => 'One or more fields are too long.']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['success' => false, 'message' => 'Invalid email address.']);
if (preg_match('/[\r\n]/', $name . $email)) respond(400, ['success' => false, 'message' => 'Invalid input.']);

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir) && !mkdir($dataDir, 0700, true)) respond(500, ['success' => false, 'message' => 'Server storage is unavailable.']);
$file = $dataDir . '/messages.json';
$messages = [];
if (is_file($file)) {
    $decoded = json_decode((string)file_get_contents($file), true);
    if (is_array($decoded)) $messages = $decoded;
}

$messages[] = [
    'name' => $name,
    'email' => $email,
    'message' => $message,
    'timestamp_utc' => gmdate('c'),
];

if (count($messages) > 500) $messages = array_slice($messages, -500);
if (file_put_contents($file, json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) respond(500, ['success' => false, 'message' => 'Could not save the message.']);

$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
respond(200, ['success' => true, 'message' => 'Thanks! Your message has been received.']);
