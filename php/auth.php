<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict',
        'path' => '/',
    ]);

    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') { header('Strict-Transport-Security: max-age=31536000; includeSubDomains'); }

function respond(int $status, array $data)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}

$host = '127.0.0.1';
$database = 'mj_website';
$username = 'root';
$password = '';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$database;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (Throwable $error) {
    respond(503, [
        'success' => false,
        'message' => 'Please start MySQL and create the MJ database.'
    ]);
}

// Per-session CSRF token for authenticated state-changing requests.
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function require_csrf(): void
{
    $provided = (string) ($_POST['csrf_token'] ?? '');
    $expected = (string) ($_SESSION['csrf_token'] ?? '');
    if ($expected === '' || !hash_equals($expected, $provided)) {
        respond(403, ['success' => false, 'message' => 'Security check failed. Please refresh and try again.']);
    }
}

function enforce_rate_limit(string $bucket, int $limit = 8, int $window = 900): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = hash('sha256', $bucket . '|' . $ip);
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mj_rate_limits';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . DIRECTORY_SEPARATOR . $key . '.json';
    $now = time();
    $data = ['started' => $now, 'count' => 0];
    if (is_file($file)) {
        $decoded = json_decode((string) @file_get_contents($file), true);
        if (is_array($decoded)) $data = $decoded;
    }
    if (($now - (int) ($data['started'] ?? $now)) > $window) $data = ['started' => $now, 'count' => 0];
    $data['count'] = (int) ($data['count'] ?? 0) + 1;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    if ($data['count'] > $limit) {
        header('Retry-After: ' . max(1, $window - ($now - (int) $data['started'])));
        respond(429, ['success' => false, 'message' => 'Too many attempts. Please wait a few minutes and try again.']);
    }
}

$mode = $_GET['mode'] ?? '';
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($mode === 'status' && $requestMethod === 'GET') {
    respond(200, [
        'success' => true,
        'authenticated' => isset($_SESSION['user_email']),
        'name' => $_SESSION['user_name'] ?? null,
        'user_id' => $_SESSION['user_id'] ?? null,
        'csrf_token' => $_SESSION['csrf_token']
    ]);
}

if ($mode === 'logout' && $requestMethod === 'POST') {
    require_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'] ?: '/', $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();

    respond(200, [
        'success' => true,
        'message' => 'Signed out successfully.'
    ]);
}

if ($requestMethod !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Invalid request.'
    ]);
}

if (in_array($mode, ['login', 'register'], true)) enforce_rate_limit($mode, 8, 900);

$email = strtolower(input('email'));
$passwordValue = (string) ($_POST['password'] ?? '');

// Login and registration require an email/password payload. Authenticated
// account-center actions (profile, password change, delete) use the email
// stored in the current session, so they must not be blocked by this check.
if (in_array($mode, ['login', 'register'], true)) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160) {
        respond(400, [
            'success' => false,
            'message' => 'Please enter a valid email address.'
        ]);
    }

    if (strlen($passwordValue) < 8 || strlen($passwordValue) > 128) {
        respond(400, [
            'success' => false,
            'message' => 'Password must be 8 to 128 characters.'
        ]);
    }
}

if ($mode === 'register' && (strlen($passwordValue) < 10 || !preg_match('/[A-Z]/', $passwordValue) || !preg_match('/[a-z]/', $passwordValue) || !preg_match('/\d/', $passwordValue))) {
    respond(400, [
        'success' => false,
        'message' => 'New passwords must be at least 10 characters and include upper, lower and a number.'
    ]);
}

if ($mode === 'register') {
    $name = input('name');

    if ($name === '' || strlen($name) > 80 || preg_match('/[\r\n]/', $name)) {
        respond(400, [
            'success' => false,
            'message' => 'Please enter a valid name.'
        ]);
    }

    try {
        $check = $pdo->prepare(
            'SELECT id FROM users WHERE email = ? LIMIT 1'
        );
        $check->execute([$email]);

        if ($check->fetch()) {
            respond(409, [
                'success' => false,
                'message' => 'This email is already registered.'
            ]);
        }

        $insert = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, created_at)
             VALUES (?, ?, ?, UTC_TIMESTAMP())'
        );

        $insert->execute([
            $name,
            $email,
            password_hash($passwordValue, PASSWORD_DEFAULT)
        ]);
    } catch (Throwable $error) {
        respond(500, [
            'success' => false,
            'message' => 'Database error. Have you imported php/mj_database.sql in phpMyAdmin?'
        ]);
    }

    session_regenerate_id(true);
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_id'] = (int) $pdo->lastInsertId();

    respond(201, [
        'success' => true,
        'message' => 'Your account was created successfully.',
        'name' => $name
    ]);
}

if ($mode === 'login') {
    try {
        $select = $pdo->prepare(
            'SELECT id, name, password_hash
             FROM users
             WHERE email = ?
             LIMIT 1'
        );
        $select->execute([$email]);
        $user = $select->fetch();
    } catch (Throwable $error) {
        respond(500, [
            'success' => false,
            'message' => 'Database error. Have you imported php/mj_database.sql in phpMyAdmin?'
        ]);
    }

    if (!$user || !password_verify($passwordValue, (string) $user['password_hash'])) {
        respond(401, [
            'success' => false,
            'message' => 'Email or password is incorrect.'
        ]);
    }

    if (password_needs_rehash((string) $user['password_hash'], PASSWORD_DEFAULT)) {
        $rehash = $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ? LIMIT 1');
        $rehash->execute([password_hash($passwordValue, PASSWORD_DEFAULT), $email]);
    }

    session_regenerate_id(true);
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = (string) $user['name'];
    $_SESSION['user_id'] = (int) $user['id'];

    respond(200, [
        'success' => true,
        'message' => 'Login successful.',
        'name' => (string) $user['name']
    ]);
}

if ($mode === 'update_profile') {
    require_csrf();
    if (!isset($_SESSION['user_email'])) respond(401, ['success'=>false,'message'=>'Please sign in again.']);
    $name = input('name');
    if ($name === '' || strlen($name) > 80 || preg_match('/[\r\n]/', $name)) respond(400, ['success'=>false,'message'=>'Please enter a valid name.']);
    try {
        $stmt = $pdo->prepare('UPDATE users SET name = ? WHERE email = ? LIMIT 1');
        $stmt->execute([$name, $_SESSION['user_email']]);
        $_SESSION['user_name'] = $name;
        respond(200, ['success'=>true,'name'=>$name,'message'=>'Profile updated.']);
    } catch (Throwable $error) { respond(500, ['success'=>false,'message'=>'Could not update your profile.']); }
}

if ($mode === 'change_password') {
    require_csrf();
    enforce_rate_limit('change_password', 5, 900);
    if (!isset($_SESSION['user_email'])) respond(401, ['success'=>false,'message'=>'Please sign in again.']);
    $current = (string) ($_POST['current_password'] ?? '');
    $new = (string) ($_POST['new_password'] ?? '');
    if (strlen($new) < 10 || strlen($new) > 128 || !preg_match('/[A-Z]/', $new) || !preg_match('/[a-z]/', $new) || !preg_match('/\d/', $new)) respond(400, ['success'=>false,'message'=>'New password must be at least 10 characters and include upper, lower and a number.']);
    try {
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$_SESSION['user_email']]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($current, (string)$user['password_hash'])) respond(401, ['success'=>false,'message'=>'Current password is incorrect.']);
        $update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ? LIMIT 1');
        $update->execute([password_hash($new, PASSWORD_DEFAULT), $_SESSION['user_email']]);
        respond(200, ['success'=>true,'message'=>'Password changed successfully.']);
    } catch (Throwable $error) { respond(500, ['success'=>false,'message'=>'Could not change your password.']); }
}

if ($mode === 'delete_account') {
    require_csrf();
    if (!isset($_SESSION['user_email'])) respond(401, ['success'=>false,'message'=>'Please sign in again.']);
    $passwordValue = (string) ($_POST['password'] ?? '');
    if ($passwordValue === '' || strlen($passwordValue) > 128) respond(400, ['success'=>false,'message'=>'Please enter your password.']);
    $sessionEmail = strtolower(trim((string) $_SESSION['user_email']));
    $sessionUserId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
    try {
        $pdo->beginTransaction();
        if ($sessionUserId > 0) {
            $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$sessionUserId]);
        } else {
            $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$sessionEmail]);
        }
        $user = $stmt->fetch();
        if (!$user || !password_verify($passwordValue, (string) $user['password_hash'])) {
            $pdo->rollBack();
            respond(401, ['success'=>false,'message'=>'Password is incorrect.']);
        }
        $delete = $pdo->prepare('DELETE FROM users WHERE id = ? LIMIT 1');
        $delete->execute([(int) $user['id']]);
        if ($delete->rowCount() !== 1) {
            $pdo->rollBack();
            respond(500, ['success'=>false,'message'=>'The account could not be removed from the database.']);
        }
        $pdo->commit();

        // Remove the authenticated session completely, including the session cookie.
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'] ?: '/', $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
        respond(200, ['success'=>true,'message'=>'Account deleted permanently.']);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(500, ['success'=>false,'message'=>'Could not delete your account from the database.']);
    }
}

respond(400, [
    'success' => false,
    'message' => 'Invalid account action.'
]);
