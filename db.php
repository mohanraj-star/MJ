<?php
declare(strict_types=1);

$host = '127.0.0.1';
$username = 'root';
$password = '';
$database = 'mj_website';

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die('Unable to connect to the database. Please start MySQL in XAMPP.');
}

$conn->set_charset('utf8mb4');
