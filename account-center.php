<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict',
        'path' => '/'
    ]);
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

if (!isset($_SESSION['user_email'])) {
    header('Location: account.php?view=login');
    exit;
}

$host = '127.0.0.1';
$database = 'mj_website';
$username = 'root';
$password = '';

$name = (string) ($_SESSION['user_name'] ?? 'MJ User');
$email = (string) $_SESSION['user_email'];
$joinedDisplay = null;

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $stmt = $pdo->prepare('SELECT name, email, created_at FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        $name = (string) $user['name'];
        $email = (string) $user['email'];
        $joinedDisplay = date('d M Y', strtotime((string) $user['created_at']));
    } else {
        $_SESSION = [];
        header('Location: account.php?view=login');
        exit;
    }
} catch (Throwable $error) {
    // Keep the session values if MySQL is temporarily unavailable.
}

$initial = $name !== '' ? mb_strtoupper(mb_substr($name, 0, 1)) : 'M';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="MJ Account Center — profile, security, privacy and account controls">
    <title>MJ · Account Center</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="account-page account-center-page">
    <div class="ambient" aria-hidden="true"><span></span><span></span><span></span><span></span></div>

    <main class="account-center-layout">
        <aside class="account-center-sidebar glass-card">
            <button class="ac-sidebar-toggle" id="ac-sidebar-toggle" type="button" aria-label="Open account menu" aria-expanded="false"><span>☰</span></button>
            <div class="ac-sidebar-backdrop" id="ac-sidebar-backdrop"></div>
            <a class="account-back" href="index.html">← MJ Website</a>
            <div class="ac-brand"><span class="ac-brand-mark">MJ</span><span>Account Center</span></div>

            <button class="ac-profile-mini" data-ac-view="overview" type="button">
                <span class="ac-avatar ac-avatar-small"><?php echo htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'); ?></span>
                <span><strong><?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?></strong><small><?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?></small></span>
            </button>

            <nav class="ac-nav" aria-label="Account settings">
                <p class="ac-nav-title">ACCOUNT</p>
                <button class="ac-nav-item active" data-ac-view="overview" type="button"><span>◈</span> Overview</button>
                <button class="ac-nav-item" data-ac-view="personal" type="button"><span>◎</span> Personal details</button>
                <button class="ac-nav-item" data-ac-view="security" type="button"><span>⌁</span> Password &amp; security</button>
                <button class="ac-nav-item" data-ac-view="activity" type="button"><span>◷</span> Login activity</button>

                <p class="ac-nav-title">PREFERENCES</p>
                <button class="ac-nav-item" data-ac-view="privacy" type="button"><span>◇</span> Privacy</button>
                <button class="ac-nav-item" data-ac-view="notifications" type="button"><span>◌</span> Notifications</button>
                <button class="ac-nav-item" data-ac-view="connected" type="button"><span>↔</span> Connected experiences</button>
                <button class="ac-nav-item" data-ac-view="ads" type="button"><span>✦</span> Ad preferences</button>

                <p class="ac-nav-title">YOUR DATA</p>
                <button class="ac-nav-item" data-ac-view="information" type="button"><span>▣</span> Information &amp; permissions</button>
                <button class="ac-nav-item" data-ac-view="manage" type="button"><span>⊞</span> Manage accounts</button>
            </nav>

            <button class="ac-logout" id="account-center-logout" type="button">Log out</button>
        </aside>

        <section class="account-center-content">
            <div class="ac-mobile-head">
                <a class="account-back" href="index.html">← MJ Website</a>
                <strong>Account Center</strong>
            </div>

            <div class="ac-view active" data-ac-panel="overview">
                <div class="ac-hero glass-card">
                    <div class="ac-avatar"><?php echo htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'); ?></div>
                    <div class="ac-hero-copy"><p class="eyebrow">ACCOUNT CENTER</p><h1><?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?></h1><p><?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?></p></div>
                    <button class="btn btn-primary" data-ac-view="personal" type="button">Edit profile</button>
                </div>
                <div class="ac-grid ac-grid-2">
                    <button class="ac-card glass-card" data-ac-view="security" type="button"><span class="ac-card-icon">⌁</span><span><strong>Password &amp; security</strong><small>Change password and protect your account.</small></span><b>›</b></button>
                    <button class="ac-card glass-card" data-ac-view="privacy" type="button"><span class="ac-card-icon">◇</span><span><strong>Privacy &amp; preferences</strong><small>Control visibility, notifications and personalization.</small></span><b>›</b></button>
                    <button class="ac-card glass-card" data-ac-view="connected" type="button"><span class="ac-card-icon">↔</span><span><strong>Connected experiences</strong><small>Manage apps and features connected to MJ.</small></span><b>›</b></button>
                    <button class="ac-card glass-card" data-ac-view="information" type="button"><span class="ac-card-icon">▣</span><span><strong>Your information</strong><small>Review search history, downloads and permissions.</small></span><b>›</b></button>
                </div>
                <div class="ac-section glass-card"><div><p class="eyebrow">ACCOUNT STATUS</p><h2>Your MJ account is active</h2><p class="ac-muted">Member since <?php echo htmlspecialchars($joinedDisplay ?? 'recently', ENT_QUOTES, 'UTF-8'); ?>. Use the controls on the left to manage your account.</p></div><span class="ac-status-pill">● Active</span></div>
            </div>

            <div class="ac-view" data-ac-panel="personal">
                <div class="ac-page-head"><p class="eyebrow">PROFILE</p><h1>Personal details</h1><p>Manage the information connected to your MJ account.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong>Name</strong><small id="profile-name-value"><?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?></small></div><button class="ac-outline" data-edit="name" type="button">Edit</button></div>
                    <div class="ac-setting-row"><div><strong>Email</strong><small><?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?></small></div><span class="ac-verified">✓ Account email</span></div>
                    <div class="ac-setting-row"><div><strong>Member since</strong><small><?php echo htmlspecialchars($joinedDisplay ?? '—', ENT_QUOTES, 'UTF-8'); ?></small></div></div>
                </div>
                <div class="ac-info-box"><strong>Profile information</strong><span>Your name is used across the MJ website. Your email is your account sign-in identifier.</span></div>
            </div>

            <div class="ac-view" data-ac-panel="security">
                <div class="ac-page-head"><p class="eyebrow">SECURITY</p><h1>Password &amp; security</h1><p>Keep your account protected and review important security controls.</p></div>
                <div class="ac-settings glass-card">
                    <button class="ac-setting-row ac-row-button" data-modal="password" type="button"><div><strong>Change password</strong><small>Set a new password for your MJ account.</small></div><b>›</b></button>
                    <div class="ac-setting-row"><div><strong>Two-step protection</strong><small>Extra verification for sensitive account changes.</small></div><label class="ac-switch"><input id="security-2fa" type="checkbox"><span></span></label></div>
                    <button class="ac-setting-row ac-row-button" data-ac-view="activity" type="button"><div><strong>Login activity</strong><small>See recent browsers and devices used with this account.</small></div><b>›</b></button>
                </div>
                <div class="ac-warning"><strong>Security tip</strong><span>Use a unique password and never share it with another person or website.</span></div>
            </div>

            <div class="ac-view" data-ac-panel="activity">
                <div class="ac-page-head"><p class="eyebrow">SECURITY</p><h1>Login activity</h1><p>Recent sign-ins recorded in this browser.</p></div>
                <div id="login-activity-list" class="ac-settings glass-card"></div>
            </div>

            <div class="ac-view" data-ac-panel="privacy">
                <div class="ac-page-head"><p class="eyebrow">PREFERENCES</p><h1>Privacy</h1><p>Choose how your MJ profile and activity are handled.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong>Private profile</strong><small>Only signed-in MJ users can view profile details.</small></div><label class="ac-switch"><input data-setting="privateProfile" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Personalized experience</strong><small>Use your preferences to tailor the MJ website.</small></div><label class="ac-switch"><input data-setting="personalized" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Activity history</strong><small>Keep useful local history for account controls.</small></div><label class="ac-switch"><input data-setting="activityHistory" type="checkbox" checked><span></span></label></div>
                </div>
            </div>

            <div class="ac-view" data-ac-panel="notifications">
                <div class="ac-page-head"><p class="eyebrow">PREFERENCES</p><h1>Notifications</h1><p>Choose which account updates you want to receive.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong>Security alerts</strong><small>Important account and sign-in notifications.</small></div><label class="ac-switch"><input data-setting="securityAlerts" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Product updates</strong><small>New MJ features and website improvements.</small></div><label class="ac-switch"><input data-setting="productUpdates" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Messages &amp; contact</strong><small>Updates related to messages sent through MJ.</small></div><label class="ac-switch"><input data-setting="messages" type="checkbox" checked><span></span></label></div>
                </div>
            </div>

            <div class="ac-view" data-ac-panel="connected">
                <div class="ac-page-head"><p class="eyebrow">CONNECTED EXPERIENCES</p><h1>Connected experiences</h1><p>Manage the services and website features that can work with your MJ account.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong>MJ Website</strong><small>Core account, profile and website access.</small></div><span class="ac-verified">Connected</span></div>
                    <div class="ac-setting-row"><div><strong>Profile sync</strong><small>Keep your account name synchronized across MJ pages.</small></div><label class="ac-switch"><input data-setting="profileSync" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Saved preferences</strong><small>Remember your theme and notification choices on this device.</small></div><label class="ac-switch"><input data-setting="savedPreferences" type="checkbox" checked><span></span></label></div>
                </div>
            </div>

            <div class="ac-view" data-ac-panel="ads">
                <div class="ac-page-head"><p class="eyebrow">PREFERENCES</p><h1>Ad preferences</h1><p>Control optional personalization used for promotional content.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong>Relevant recommendations</strong><small>Allow MJ to use your selected interests to make recommendations.</small></div><label class="ac-switch"><input data-setting="relevantAds" type="checkbox" checked><span></span></label></div>
                    <div class="ac-setting-row"><div><strong>Activity-based recommendations</strong><small>Use website interactions to improve suggested content.</small></div><label class="ac-switch"><input data-setting="activityAds" type="checkbox"><span></span></label></div>
                </div>
            </div>

            <div class="ac-view" data-ac-panel="information">
                <div class="ac-page-head"><p class="eyebrow">YOUR DATA</p><h1>Information &amp; permissions</h1><p>Review the information and permissions associated with your MJ account.</p></div>
                <div class="ac-grid ac-grid-2">
                    <button class="ac-card glass-card" data-ac-action="export" type="button"><span class="ac-card-icon">↓</span><span><strong>Download your information</strong><small>Create a copy of your account details and saved preferences.</small></span><b>›</b></button>
                    <button class="ac-card glass-card" data-ac-action="clear" type="button"><span class="ac-card-icon">⌫</span><span><strong>Clear local activity</strong><small>Remove locally stored MJ preference and activity data.</small></span><b>›</b></button>
                    <button class="ac-card glass-card" data-ac-view="activity" type="button"><span class="ac-card-icon">◷</span><span><strong>Search &amp; activity history</strong><small>Review recent activity saved by this browser.</small></span><b>›</b></button>
                </div>
            </div>

            <div class="ac-view" data-ac-panel="manage">
                <div class="ac-page-head"><p class="eyebrow">ACCOUNT CONTROL</p><h1>Manage accounts</h1><p>Manage this MJ account or permanently close it.</p></div>
                <div class="ac-settings glass-card">
                    <div class="ac-setting-row"><div><strong><?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?></strong><small><?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?></small></div><span class="ac-status-pill">● Current</span></div>
                    <button class="ac-setting-row ac-row-button danger" data-modal="delete" type="button"><div><strong>Delete account</strong><small>Permanently remove this MJ account and sign out.</small></div><b>›</b></button>
                </div>
            </div>
        </section>
    </main>

    <div class="ac-modal-backdrop" id="ac-modal-backdrop" hidden>
        <div class="ac-modal glass-card" role="dialog" aria-modal="true" aria-labelledby="ac-modal-title">
            <button class="ac-modal-close" id="ac-modal-close" type="button" aria-label="Close">×</button>
            <p class="eyebrow" id="ac-modal-eyebrow">ACCOUNT</p><h2 id="ac-modal-title">Change password</h2><div id="ac-modal-body"></div>
        </div>
    </div>

    <meta name="mj-account-name" content="<?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="mj-account-email" content="<?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="mj-account-joined" content="<?php echo htmlspecialchars((string) $joinedDisplay, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="mj-account-csrf" content="<?php echo htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8'); ?>">
    <script src="js/account-center.js" defer></script>
</body>
</html>
