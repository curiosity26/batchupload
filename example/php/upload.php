<?php

// Disabled cache
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	exit;
}

// Settings
$targetDir = FILE_UPLOAD_DIR;
$maxFileAge = 5 * 3600; // Temp file age in seconds

// Create target dir
if (!file_exists($targetDir)) {
	@mkdir($targetDir);
}

// Get a file name
if (isset($_REQUEST["name"])) {
	$fileName = $_REQUEST["name"];
} elseif (!empty($_FILES)) {
	$fileName = $_FILES["file"]["name"];
}

// Chunking might be enabled
$chunk = intval($_REQUEST["chunk"]) > 0 ? intval($_REQUEST["chunk"]) : 1;
$chunks = intval($_REQUEST["chunks"]) > 0 ? intval($_REQUEST["chunks"]) : 1;

$filePath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
move_uploaded_file($_FILES["file"]["tmp_name"], $filePath . '-' . $chunk . '.part');
sleep(1); // Give it a moment

// Check if file has been uploaded
if (!$chunks || $chunk == $chunks) {
	$out = @fopen($filePath, 'wb');
	for ($i = 0; $i < $chunks; $i++) {
		$in = @fopen($filePath . '-' . $i . '.part', 'rb');
		stream_copy_to_stream($in, $out);
		@fclose($in);
		unlink($filePath . '-' . $i . '.part');
	}
	@fclose($out);
}

// Return Success Response
die(json_encode(array(
	'filename' => $fileName,
	'chunk' => $chunk,
	'chunks' => $chunks,
)));

?>