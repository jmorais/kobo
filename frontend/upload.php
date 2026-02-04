<?php
declare(strict_types=1);

$targetDir = __DIR__ . '/uploads';
$logPath   = $targetDir . '/upload.log';
$filename = 'KoboUpload.tar';
$destination = $targetDir . '/' . $filename;
$repoRoot = dirname(__DIR__);
$statsPath = $repoRoot . '/stats.rb';
$outputPath = $repoRoot . '/frontend/data.json';
$coversDir = $repoRoot . '/frontend/covers';

function log_line(string $path, string $message): void {
  $ts = date('c');
  file_put_contents($path, "[$ts] $message\n", FILE_APPEND);
}

function rrmdir(string $dir): void {
  if (!is_dir($dir)) {
    return;
  }

  $items = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
  );

  foreach ($items as $item) {
    if ($item->isDir()) {
      rmdir($item->getPathname());
    } else {
      unlink($item->getPathname());
    }
  }

  rmdir($dir);
}

function move_kobo_images(string $sourceDir, string $outputDir, string $logPath): int {
  if (!is_dir($sourceDir)) {
    log_line($logPath, "Images dir not found: $sourceDir");
    return 0;
  }

  rrmdir($outputDir);
  mkdir($outputDir, 0755, true);

  $count = 0;
  $items = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($sourceDir, FilesystemIterator::SKIP_DOTS)
  );

  foreach ($items as $item) {
    if (!$item->isFile()) {
      continue;
    }

    $basename = $item->getBasename();
    $basename = preg_replace('/\.parsed\z/i', '', $basename);
    if (!preg_match('/\.jpg\z/i', $basename)) {
      $basename .= '.jpg';
    }

    $target = $outputDir . '/' . $basename;
    $source = $item->getPathname();

    if (!@rename($source, $target)) {
      if (@copy($source, $target)) {
        @unlink($source);
      }
    }

    $count++;
  }

  return $count;
}

function detect_upload_type(string $path): string {
  $handle = fopen($path, 'rb');
  if ($handle === false) {
    return 'unknown';
  }
  $header = fread($handle, 4);
  $tarHeader = '';
  if (fseek($handle, 257) === 0) {
    $tarHeader = fread($handle, 5);
  }
  fclose($handle);

  if ($header === false || $header === '') {
    return 'unknown';
  }

  if (strncmp($header, "PK\x03\x04", 4) === 0
    || strncmp($header, "PK\x05\x06", 4) === 0
    || strncmp($header, "PK\x07\x08", 4) === 0) {
    return 'zip';
  }

  if (strncmp($header, "\x1f\x8b", 2) === 0) {
    return 'gzip';
  }

  if ($tarHeader === 'ustar') {
    return 'tar';
  }

  return 'unknown';
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
$uploadedPath = '';

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
  $uploadedPath = $destination;
} else {
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
  $in  = fopen('php://input', 'rb');
  $outPath = $destination;
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
  $uploadedPath = $destination;
}

$extractDir = $targetDir . '/extracted_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4));
$uploadType = detect_upload_type($uploadedPath);
log_line($logPath, "Detected upload type: $uploadType");

mkdir($extractDir, 0755, true);

$sqlitePath = $extractDir . '/KoboReader.sqlite';
$imagesDir = $extractDir . '/.kobo-images';

if ($uploadType === 'zip') {
  $zip = new ZipArchive();
  if ($zip->open($uploadedPath) === true) {
    $zip->extractTo($extractDir);
    $zip->close();
    log_line($logPath, "Zip extracted to $extractDir");
  } else {
    log_line($logPath, 'Failed to open zip for extraction');
    http_response_code(400);
    echo "Invalid zip\n";
    exit;
  }
} elseif ($uploadType === 'tar') {
  try {
    $tar = new PharData($uploadedPath);
    $tar->extractTo($extractDir, null, true);
    log_line($logPath, "Tar extracted to $extractDir");
  } catch (Exception $e) {
    log_line($logPath, 'Failed to extract tar: ' . $e->getMessage());
    http_response_code(400);
    echo "Invalid tar\n";
    exit;
  }
} elseif ($uploadType === 'gzip') {
  $gz = gzopen($uploadedPath, 'rb');
  if ($gz === false) {
    log_line($logPath, 'Failed to open gzip payload');
    http_response_code(400);
    echo "Invalid gzip\n";
    exit;
  }
  $out = fopen($sqlitePath, 'wb');
  if ($out === false) {
    gzclose($gz);
    log_line($logPath, 'Failed to open sqlite output for gzip');
    http_response_code(500);
    echo "Failed to save sqlite\n";
    exit;
  }
  while (!gzeof($gz)) {
    $chunk = gzread($gz, 1024 * 1024);
    if ($chunk === false) {
      break;
    }
    fwrite($out, $chunk);
  }
  gzclose($gz);
  fclose($out);
  log_line($logPath, "Gzip decompressed to $sqlitePath");
} else {
  log_line($logPath, 'Unknown upload type');
  http_response_code(400);
  echo "Unsupported upload type\n";
  exit;
}

if (is_file($uploadedPath)) {
  log_line($logPath, 'Keeping uploaded payload after extraction');
}

if (!is_file($sqlitePath)) {
  log_line($logPath, "Missing sqlite after extraction: $sqlitePath");
  http_response_code(400);
  echo "Missing sqlite\n";
  exit;
}

$coversCount = move_kobo_images($imagesDir, $coversDir, $logPath);
log_line($logPath, "Covers moved: $coversCount");

if (is_file($statsPath)) {
  $rvmScript = getenv('HOME') . '/.rvm/scripts/rvm';
  $rubyCmd = 'ruby ' . escapeshellarg($statsPath)
    . ' -d ' . escapeshellarg($sqlitePath)
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
  } else {
    log_line($logPath, 'Failed to start stats process');
  }
} else {
  log_line($logPath, 'stats.rb not found, skipping');
}

rrmdir($extractDir);

echo "OK\n";
