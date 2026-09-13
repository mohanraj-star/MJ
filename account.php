<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Strict'
    ]);

    session_start();
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

$view = ($_GET['view'] ?? 'login') === 'register'
    ? 'register'
    : 'login';
?>

<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta
        name="description"
        content="MJ secure account access"
    >

    <title>MJ · Account</title>

    <link rel="stylesheet" href="css/style.css">
</head>

<body class="account-page">

    <div class="ambient" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
    </div>

    <main class="account-shell">

        <a class="account-back" href="index.html" target="_self">
            ← MJ Website
        </a>

        <div class="account-panel glass-card">

            <div class="account-logo">MJ</div>

            <p class="eyebrow">
                <?php echo $view === 'register' ? 'CREATE YOUR ACCOUNT' : 'SECURE ACCOUNT'; ?>
            </p>

            <?php if ($view === 'register'): ?>

                <form
                    id="register-form"
                    class="auth-form"
                >

                    <div class="form-group">
                        <label for="register-name">
                            Name
                        </label>

                        <input
                            id="register-name"
                            name="name"
                            type="text"
                            maxlength="80"
                            autocomplete="name"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="register-email">
                            Email
                        </label>

                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            maxlength="160"
                            autocomplete="email"
                            required
                        >
                    </div>

                    <div class="form-group password-wrap">

                        <label for="register-password">
                            Password
                        </label>

                        <input
                            id="register-password"
                            name="password"
                            type="password"
                            minlength="10"
                            maxlength="128"
                            autocomplete="new-password"
                            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}"
                            required
                        >

                        <button
                            class="password-toggle"
                            type="button"
                            data-password-toggle="register-password"
                            aria-label="Show password"
                        >
                            ◉
                        </button>

                    </div>

                    <button
                        class="btn btn-primary full"
                        type="submit"
                    >
                        Create Account
                    </button>

                    <div
                        id="register-status"
                        class="form-status"
                    ></div>

                </form>

            <?php else: ?>

                <form
                    id="login-form"
                    class="auth-form"
                >

                    <div class="form-group">

                        <label for="login-email">
                            Email
                        </label>

                        <input
                            id="login-email"
                            name="email"
                            type="email"
                            maxlength="160"
                            autocomplete="email"
                            required
                        >

                    </div>

                    <div class="form-group password-wrap">

                        <label for="login-password">
                            Password
                        </label>

                        <input
                            id="login-password"
                            name="password"
                            type="password"
                            maxlength="128"
                            autocomplete="current-password"
                            required
                        >

                        <button
                            class="password-toggle"
                            type="button"
                            data-password-toggle="login-password"
                            aria-label="Show password"
                        >
                            ◉
                        </button>

                    </div>

                    <button
                        class="btn btn-primary full"
                        type="submit"
                    >
                        Sign In
                    </button>

                    <div
                        id="login-status"
                        class="form-status"
                    ></div>

                </form>

            <?php endif; ?>

            <p class="account-note">
                Your details stay private — MJ never shares your account with anyone.
            </p>

        </div>

        <div class="account-switch glass-card">
            <?php if ($view === 'register'): ?>
                <p>Already have an account? <a href="account.php?view=login">Log in</a></p>
            <?php else: ?>
                <p>Don't have an account? <a href="account.php?view=register">Sign up</a></p>
            <?php endif; ?>
        </div>

    </main>

    <script src="js/account.js" defer></script>

</body>
</html>