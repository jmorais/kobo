<?php
declare(strict_types=1);

$targetDir = __DIR__ . '/uploads';
$logPath   = $targetDir . '/upload.log';
$filename = 'KoboReader.sqlite';
$destination = $targetDir . '/' . $filename;
$gzipDestination = $destination . '.gz';
$repoRoot = dirname(__DIR__);
$statsPath = $repoRoot . '/stats.rb';
$outputPath = $repoRoot . '/frontend/data.json';

function log_line(string $path, string $message): void {
  $ts = date('c');
  file_put_contents($path, "[$ts] $message\n", FILE_APPEND);
}

if (!is_dir($targetDir)) {
  mkdir($targetDir, 0755, true);
}

log_line($logPath, 'Upload request received');

/* -----------------------------
   Reject anything but POST
------------------------------ */
$method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
if ($method !== 'POST') {
  log_line($logPath, "Rejected: method=$method");
  http_response_code(405);
  echo "Method not allowed\n";
  exit;
}

/* -----------------------------
   Multipart upload (not expected,
   but supported)
------------------------------ */
if (isset($_FILES['file'])) {
  log_line($logPath, 'Multipart upload detected');

  if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    log_line($logPath, 'Upload error code: ' . $_FILES['file']['error']);
    http_response_code(400);
    echo "Upload failed\n";
    exit;
  }

  log_line($logPath, "Saving multipart to $destination");

  if (!move_uploaded_file($_FILES['file']['tmp_name'], $destination)) {
    log_line($logPath, 'Failed to move uploaded file');
    http_response_code(500);
    echo "Failed to save file\n";
    exit;
  }

  log_line($logPath, 'Multipart upload complete');
  echo "OK\n";
  exit;
}

/* -----------------------------
   Raw POST upload (nc / BusyBox)
------------------------------ */
$contentLength = isset($_SERVER['CONTENT_LENGTH'])
  ? (int)$_SERVER['CONTENT_LENGTH']
  : 0;

$contentType = $_SERVER['CONTENT_TYPE'] ?? 'unknown';
$contentEncoding = $_SERVER['HTTP_CONTENT_ENCODING'] ?? ($_SERVER['CONTENT_ENCODING'] ?? '');
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$remoteAddr = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

log_line(
  $logPath,
  "Raw upload: content-length=$contentLength content-type=$contentType content-encoding=$contentEncoding user-agent=$userAgent remote-addr=$remoteAddr"
);

if ($contentLength <= 0) {
  log_line($logPath, 'Rejected: missing or invalid Content-Length');
  http_response_code(411);
  echo "Content-Length required\n";
  exit;
}

/* -----------------------------
   Stream body to disk
------------------------------ */
$isGzip = stripos($contentType, 'application/gzip') !== false
  || stripos($contentType, 'application/x-gzip') !== false
  || stripos($contentEncoding, 'gzip') !== false;

$in  = fopen('php://input', 'rb');
$outPath = $isGzip ? $gzipDestination : $destination;
$out = fopen($outPath, 'wb');

if ($in === false || $out === false) {
  log_line($logPath, 'Failed to open streams');
  http_response_code(500);
  echo "Internal error\n";
  exit;
}

$bytes = stream_copy_to_stream($in, $out);

fclose($in);
fclose($out);

if ($bytes === false || $bytes <= 0) {
  log_line($logPath, 'No data received');
  http_response_code(400);
  echo "No data received\n";
  exit;
}

if ($isGzip) {
  log_line($logPath, 'Detected gzip payload, decompressing');
  $gz = gzopen($gzipDestination, 'rb');
  if ($gz === false) {
    log_line($logPath, 'Failed to open gzip file');
    http_response_code(500);
    echo "Failed to decompress\n";
    exit;
  }
  $outDecompressed = fopen($destination, 'wb');
  if ($outDecompressed === false) {
    gzclose($gz);
    log_line($logPath, 'Failed to open destination for decompressed file');
    http_response_code(500);
    echo "Failed to save file\n";
    exit;
  }
  while (!gzeof($gz)) {
    $chunk = gzread($gz, 1024 * 1024);
    if ($chunk === false) {
      break;
    }
    fwrite($outDecompressed, $chunk);
  }
  gzclose($gz);
  fclose($outDecompressed);
  if (is_file($gzipDestination)) {
    unlink($gzipDestination);
  }
  log_line($logPath, 'Decompression complete');
}

/* -----------------------------
   Verify size matches
------------------------------ */
if ($bytes !== $contentLength) {
  log_line(
    $logPath,
    "Size mismatch: expected=$contentLength got=$bytes"
  );
  http_response_code(400);
  echo "Size mismatch\n";
  exit;
}

log_line($logPath, "Raw upload complete: $bytes bytes written");
log_line($logPath, 'Upload saved successfully');

if (is_file($statsPath)) {
  $rvmScript = getenv('HOME') . '/.rvm/scripts/rvm';
  $rubyCmd = 'ruby ' . escapeshellarg($statsPath)
    . ' -d ' . escapeshellarg($destination)
    . ' -o ' . escapeshellarg($outputPath);
  if (is_file($rvmScript)) {
    $cmd = '/bin/bash -lc ' . escapeshellarg(
      'source ' . escapeshellarg($rvmScript)
      . ' && rvm use ruby-3.0.0@default && ' . $rubyCmd
    );
  } else {
    $cmd = $rubyCmd;
  }
  log_line($logPath, 'Running stats: ' . $cmd);

  $descriptors = [
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
  ];

  $process = proc_open($cmd, $descriptors, $pipes, $repoRoot);
  if (is_resource($process)) {
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    log_line($logPath, "Stats exit code: $exitCode");
    if ($stdout !== '') {
      log_line($logPath, 'Stats stdout: ' . trim($stdout));
    }
    if ($stderr !== '') {
      log_line($logPath, 'Stats stderr: ' . trim($stderr));
    }
    if (is_file($destination)) {
      unlink($destination);
      log_line($logPath, 'Removed sqlite after stats');
    }
  } else {
    log_line($logPath, 'Failed to start stats process');
  }
} else {
  log_line($logPath, 'stats.rb not found, skipping');
}

echo "OK\n";
