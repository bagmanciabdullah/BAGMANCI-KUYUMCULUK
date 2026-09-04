<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$endpoint = isset($_GET['type']) && $_GET['type'] === 'count'
    ? 'https://www.sukobfiyat.com/api/countseen/?cache=' . time()
    : 'https://www.sukobfiyat.com/api/prices/?cache=' . time();

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 5,
        'header' => "Accept: application/json\r\nUser-Agent: BagmanciKuyumculuk/1.0\r\n"
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true
    ]
]);

$response = @file_get_contents($endpoint, false, $context);

if ($response === false) {
    http_response_code(502);
    echo json_encode([
        'error' => true,
        'message' => 'SUKOB canlı veri alınamadı'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo $response;
