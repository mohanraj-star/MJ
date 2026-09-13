MJ Website — XAMPP account edition

1. Copy this folder to C:/xampp/htdocs/mj-website (or use the included start scripts).
2. Start Apache and MySQL in XAMPP.
3. Open phpMyAdmin and import php/mj_database.sql.
4. Open http://localhost/mj-website/ .
5. Account -> Login/Register opens account.php in the same tab. Login/Register share the same MJ account interface, with a simple tab switch. Once signed in, the Account menu and homepage teaser show a Logout button instead — log out to see Login/Register again.
6. Passwords are hashed with PHP password_hash/password_verify. Never expose php/data or database credentials publicly.
7. For production, use HTTPS and a dedicated MySQL user with only the permissions required by this database.
8. The clock remains in the hero until the user scrolls/swipes; then it smoothly docks into the navbar and stays there. Clicking it activates the local Radha Krishna wallpaper and remembers that choice in this browser.
