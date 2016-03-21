# Batch Upload
An Event-based JavaScript batched upload library written in native JavaScript to be usable with any other framework or library. 

*Also includes the FileDropUpload class to connect HTML5 File Drag and Drop to a UI component*

## Preparing the Back End

Batch Upload uses the HTML5 FormData object to send chunks of file data along with information about the file data for the backend to gather, track and reassemble the chunks in the correct order.

An short [example in PHP](example/php/upload.php) would be something like this (this example will be our reference to how the backend will expect the data):

```PHP
// upload.php

// Specify where the chunks and files will be saved
$targetDir = FILE_UPLOAD_DIR;

// Get the file's name
$fileName = $_FILES["file"]["name"];

// Get which chunk is being recieved
$chunk = intval($_REQUEST["chunk"]) > 0 ? intval($_REQUEST["chunk"]) : 1;

// How many chunks are expected?
$chunks = intval($_REQUEST["chunks"]) > 0 ? intval($_REQUEST["chunks"]) : 1;

// Move the file data to the target directory, use the filename as an identifier along with the chunk info
$filePath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
move_uploaded_file($_FILES["file"]["tmp_name"], $filePath.'-'.$chunk.'.part');
sleep(1); // Give it a moment

// Check if file has been uploaded
if (!$chunks || $chunk == $chunks) {
    $out = @fopen($filePath, 'wb');
    // Combine the chunks back into the correct order
    for ($i = 0; $i < $chunks; $i++) {
      $in = @fopen($filePath.'-'.$i.'.part', 'rb');
      stream_copy_to_stream($in, $out);
      @fclose($in);
      // Delete the chunk part, as it is no longer needed
      unlink($filePath.'-'.$i.'.part');
    }
    @fclose($out);
}

// Return Success Response, your front-end will handle progress logic
die(json_encode(array(
		'filename' => $fileName,
		'chunk' => $chunk,
		'chunks' => $chunks
	)));
```

## FileUploadManager

The FileUploadManager class object is the easiest way to handle mutiple batch uploads. Batch uploading a file can be handled with only the [FileUpload](#fileupload) class object, but the FileUploadManager makes it easier to manage one or more file uploads overall.

FileUploadManager also handles some basic file validation before queuing the file for upload.

### Settings

| Settings | Default | Description |
--
| maxQueue | 6 | The maximum number of files to be simultaneously uploaded for this instantiation. |
| url | null | The URL of the backend script that will handle the file upload, e.g. `upload.php`. |
| method | POST | The HTTP method used to send the data. PUT is also acceptable, but symantically POST is most correct. |
| autoStart | true | Automatically start the upload queue when files are provided. If false, the `start()` method will need to be called to start uploads. |
| allowedTypes | [] | A list of permitted file MIME types. Defaulty, all file types are permitted to be uploaded. Any mime types not in the list will not be queued. e.g., image/png |
| allowedExtensions | [] | A list of permitted file extensions. Defaultly, all extensions are permitted. |
| maxFileSize | null | The maximum size of a file for upload (in bytes). Files larger than this size are rejected. Defaultly, there is no restriction on file size. |
| maxChunkSize | 1048576 | The maximum size (in bytes) of the chunk sent to the server. Default is 1MB. |
| formFileField | file | The name of the parameter the backend uses to capture the file data. |
| chunkParameter | chunk | The name of the parameter the backend uses to determine which chunk is being uploaded. |
| chunksParameter | chunks | The name of the parameter the backend uses to determine how many chunks to expect. |

* Note: File validation priority goes size, mime type, extension. If 'image/jpeg' is the `allowedTypes` list and the `allowedExtentions` list has values but '.jpg' is not in the list, the file will be rejected. If 'image/jpeg' is in the `allowedTypes` list and the `allowedExtensions` is empty, then the file will be accepted. And vice-versa.  *

### Methods

| Method | Description |
--
| addFile(File *file*) | Adds a File object to the queue for uploading. If the queue isn't paused, queue autostarting is permitted, and the queue length is less than the configured `maxQueue` setting, the upload will automatically start. If the file is successfully loaded into the queue, given it passes validation checks, a `queue` event will be issued on the instantiated `FileUploadManager` object for which the File is queued. |
| setFiles(FileList|Array[File] *files*) | Sets the list of files to upload to the queue with similar behavior to that of `addFile()` but is destructive. If any files are in the queue, they will be trashed. |
| start() | Starts uploading the queue of files. This has no affect if the queue is already started. A `start` event is triggered. |
| pause() | Pauses the upload queue. All [FileUpload](#fileupload)s will finish uploading their current chunk and wait for to upload the next chunk until the queue is started. If the `FileUpload` has completed its last chunk, the `complete` event will trigger and the `FileUploadManager` will issue the `file_complete` event. |
| clearQueue() | Clears all files that are queued for upload. Any current uploads will be trashed along with queued files |
| clearErrors() | The `FileUploadManager` keeps errored and completed files in seperate queues to reference in the `FileUploadEvent` object. This method will clear the errors queue. |
| clearCompleted() | Like `clearErrors()`, but clears the completed files. |
| validateTypes(File *file*) | Validates a File's type with the `FileUploadManager`s settings if the `allowedTypes` setting is configured. If a File's type is not valid, the File will not be queue. |
| validateExts(File *file*) | Validates a File's extensions if the `allowedExtensions` setting is configured. |
| validateSize(File *file*) | Validates a File's file size if the `maxFileSize` setting is configured. |
| validate(File *file*) | Runs the three previous validation functions on the provided File. |
| setSettings(Object settings) | Sets the settings object for an instance of a `FileUploadManager`. | 
| addEventListener(event, callback) | Add a callback function to a `FileUploadManager` object to be trigger for a specific event. The callback function will receive a `FileManagerEvent` object as its only parameter. See Events below. |
| removeEventListener(event, callback) | Removes a callback function from a specific event. See Events below. | removeAllListeners() | Removes all event callbacks from the `FileUploadManager` object. |
| dispatchEvent(event) | Triggers all listener callbacks for the given event. See Events below. |


### Events

| Event Name | Description |
--
| start | Dispatches when the `start()` method is successfully called. |
| pause | Dispatched when the `pause()` method is successfully called. |
| queue | Dispatched when a file is successfully add to the upload queue. |
| file_start | Dispatched when a [FileUpload](#fileupload) object in the queue begins its upload process. |
| file_progress | Dispatched when upload information on a [FileUpload](#fileupload) object is updated. |
| file_complete | Dispatched when a [FileUpload](#fileupload) object has successfully uploaded all its chunks. |
| file_error | Dispatched when a [FileUpload](#fileupload) object fails to upload a chunk. |


## FileManagerEvent

An object with information about a [FileUploadManager](#fileuploadmanagers)s state.

### Properties

| Property Name | Description |
--
| bytesLoaded&dagger; | The bytes uploaded to the server for a the [FileUpload](#fileupload) object which triggered the event on the `FileUploadManager`. |
| bytesTotal&dagger; | The total file size in bytes for the [FileUpload](#fileupload) object which triggered the event on the `FileUploadManager`. |
| totalBytesLoaded | The total number of bytes that have been uploaded for the `FileUploadManager`s queue. |
| totalBytesTotal | The sum of all the file sizes loaded into the `FileUploadManager`s queue. |
| currentTarget&dagger; | The [FileUpload](#fileupload) which triggered the event on the `FileUploadManager`. |
| file&dagger; | The File object the [FileUpload](#fileupload) is uploading. |
| queue | The upload queue at the time the event was triggered. |
| errors | Errors that have occurred by the time the event was triggered. |
| fileList | Files that have not been queued for upload at the time the event was triggered. |
| completed | [FileUpload](#fileupload)s that have been completed by the time this event was triggered. |
| data&dagger; | *Only used for 'file_complete' events.* The XHR response from the final upload request, JSON parsed. |

*&dagger; This property is not used if the event was not triggered because of a `FileUpload` object.*

## FileUpload

### Settings

| Settings | Default | Description |
--
| filename | null | The filename the backend should use. If null, the filename from the File object is used. |
| url | null | The URL of the backend script that will handle the file upload, e.g. `upload.php` |
| method | POST | The HTTP method used to send the data. PUT is also acceptable, but symantically POST is most correct |
| autoStart | true | Automatically start the upload queue when files are provided. If false, the `start()` method will need to be called to start uploads. |
| maxChunkSize | 1048576 | The maximum size (in bytes) of the chunk sent to the server. Default is 1MB. |
| formFileField | file | The name of the parameter the backend uses to capture the file data. |
| chunkParameter | chunk | The name of the parameter the backend uses to determine which chunk is being uploaded. |
| chunksParameter | chunks | The name of the parameter the backend uses to determine how many chunks to expect. |

### Methods

| Method | Description |
--
| new FileUpload(Blob *file*, Object *settings*) | Constructor |
| start() | Starts the upload process. Dispatches the 'start' event. |
| pause() | Pauses the upload process. Dispatches the 'pause' event. |
| reset() | Resets the upload process. Calls `pause()` and `start()` (if previously unpaused). |
| setSettings(Object *settings*) | Sets the settings object. |
| setUrl(String *url*) | Sets the URL to upload the file to. **Do not change mid-upload. This will corrupt the upload.** |
| addEventListener(event, callback) | Add a callback function to a `FileUpload` object to be trigger for a specific event. The callback function will receive a `FileUploadEvent` object as its only parameter. See Events below. |
| removeEventListener(event, callback) | Removes a callback function from a specific event. See Events below. | removeAllListeners() | Removes all event callbacks from the `FileUpload` object. |
| dispatchEvent(event) | Triggers all listener callbacks for the given event. See Events below. |

### Events

| start | Dispatches when the `start()` method is successfully called. |
| pause | Dispatched when the `pause()` method is successfully called. |
| progress | Dispatched when upload progress updated. |
| complete | Dispatched when successfully uploaded all its chunks. |
| error | Dispatched when fails to upload a chunk. |

## FileUploadEvent

| Property Name | Description |
--
| bytesLoaded | Number of bytes sent to the server. |
| bytesTotal | Total number of bytes to be uploaded. |
| filename | The filename used by the server. |
| file | The File object being uploaded. |
| duration | The total duration (in seconds) the upload took. *Doesn't include paused time.* |
| data | The JSON parsed response from the server. *Only used for 'error' and 'complete' events. |
| header | The response headers from the server. *Only used for 'error' and 'complete' events. |

## FileDropZone

## List


