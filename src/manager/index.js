/**
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-24
 **/
import {Emitter, FileManagerEvent} from "../event";
import {FileMap} from "../type/filemap";
import {FileUpload} from "../type/fileupload"

class FileUploadManager extends Emitter {
    private _settings = new FileManagerSettings();
    private _files = new Set();
    private _queue = new FileManagerQueue();
    private _completed = new FileMap();
    private _errors = new FileMap();
    private _bytesTotal = 0;
    private _bytesLoaded = 0;


    constructor(settings) {
        super();

        if (settings instanceof FileManagerSettings) {
            this._settings = settings;
        } else {
            this._settings = new FileManagerSettings(settings);
        }
    }

    get settings() {
        return this._settings;
    }

    add(file) {
        if (!file instanceof File) {
            // If it's an actual file, just throw it in the error queue
            if (file instanceof File) {
                this._errors.add(file);
                const e = new FileManagerEvent('invalid', {
                    bytesLoaded: 0,
                    bytesTotal: file.size,
                    totalBytesLoaded: _self.bytesLoaded,
                    totalBytesTotal: _self.bytesTotal,
                    currentTarget: this,
                    queue: _queue.toArray(),
                    file: file,
                    fileList: _fileList,
                    completed: _completed.toArray(),
                    errors: _errors.toArray()
                });

                this.dispatch(e);
            }

            return this;
        }

        if (!this.validate(file)) {
            this._errors.add(file);

            return this;
        }

        this._files.add(file);
        this._bytesTotal += file.size;

        this.queue();

        return this;
    }

    setFiles(files) {
        if (!files instanceof FileList || !files instanceof Array || files.length === 0) {
            return this;
        }

        this.pause();

        if (files instanceof FileList) {
            for (let i = 0; i < files.length; i++) {
                this.addFile(files.item(i));
            }
        }
        else {
            for (let i = 0; i < files.length; i++) {
                this.addFile(files[i]);
            }
        }

        if (this.settings.autoStart === true) {
            this.start();
        }

        return this;
    }

    clearQueue() {
        this._queue.clear();
    }

    clearCompleted() {
        this._completed.clear();
    }

    clearErrors() {
        this._errors.clear();
    }

    private queue() {
        while(this._queue.length < this.settings.maxQueue && this.files.length > 0) {
            const file = this.files.shift();
            if (!!file) {
                // Create the FileUpload to queue
                const fu = new FileUpload(file, {
                    url: this.settings.url,
                    method: this.settings.method,
                    autoStart: false,
                    maxChunkSize: this.settings.maxChunkSize,
                    formFileField: this.settings.formFileField,
                    chunkParameter: this.settings.chunkParameter,
                    chunksParameter: this.settings.chunksParameter
                });

                // Update the total queue size
                this._bytesTotal += file.size;

                this.bindEvents(fu);

                // Add the uploader to the queue
                this._queue.add(fu);

                // Dispatch an queue event
                this.dispatch(new FileManagerEvent('queue', {
                    bytesLoaded: 0,
                    bytesTotal: file.size,
                    totalBytesLoaded: this._bytesLoaded,
                    totalBytesTotal: this._bytesTotal,
                    currentTarget: fu,
                    queue: this._queue,
                    file: file,
                    fileList: this._files,
                    completed: this._completed,
                    errors: this._errors
                }));

                // If the manager isn't paused, start the upload
                if (!this.paused) {
                    fu.start();
                }
            }
        }
    }

    private bindEvents(file) {
        file.on('start', this.onStart);
        file.on('pause', this.onPause);
        file.on('progress', this.onProgress);
        file.on('error', this.onError);
        file.on('complete', this.onComplete);
    }

    private onStart(event) {
        const e = new FileManagerEvent('file_start', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: this._bytesLoaded,
            totalBytesTotal: this._bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: this._queue,
            errors: this._errors,
            fileList: this._files,
            completed: this._completed
        });

        _self.dispatchEvent(e);
    };

    private onPause(event) {
        const e = new FileManagerEvent('file_pause', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: this._bytesLoaded,
            totalBytesTotal: this._bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: this._queue,
            errors: this._errors,
            fileList: this._files,
            completed: this._completed
        });

        this.dispatch(e);
    };

    private onProgress(event) {
        this._bytesLoaded += event.bytesLoaded;

        const e = new FileManagerEvent('progress', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: this._bytesLoaded,
            totalBytesTotal: this._bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: this._queue,
            errors: this._errors,
            fileList: this._files,
            completed: this._completed
        });

        this.dispatch(e);
    };

    private onError(event) {
        this._errors.add(event.target);

        const e = new FileManagerEvent('error', {
            bytesLoaded: 0,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: this._bytesLoaded,
            totalBytesTotal: this._bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: this._queue,
            errors: this._errors,
            fileList: this._files,
            completed: this,_completed,
            fileError: event
        });

        this.dispatch(e);
        this.queue();
    };

    /**
     * Fires when FileUpload is complete
     * @param {FileUploadEvent} event
     */
    private onComplete(event) {
        this._completed.add(event.target);

        const e = new FileManagerEvent('complete', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: this._bytesLoaded,
            totalBytesTotal: this._bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: this._queue,
            errors: this._errors,
            fileList: this._files,
            completed: this._completed,
            data: event.data
        });

        this.dispatch(e);
        this.queue();
    };

    private validateTypes(file) {
        if (this.settings.allowedTypes instanceof Set) {
            let ret = false;
            this.settings.allowedTypes.forEach((type) => {
                if (file.type === type.trim()) {
                    ret = true;
                    return ret;
                }
            });

            return ret;
        }

        return true;
    };

    private validateExts(file) {
        if (this.settings.allowedExtensions instanceof Set) {
            let ret = false;
            const parts = file.name.split('.');
            const ext = parts.pop();
            this.settings.allowedExtensions.forEach((e) => {
                if (ext === e.trim()) {
                    ret = true;
                    return ret;
                }
            });

            return ret;
        }

        return true;
    };

    private validateSize(file) {
        const ms = this.settings.maxFileSize;
        if (!ms || isNaN(ms)) {
            return true;
        }
        return file.size <= ms;
    };

    private validate(file) {
        const size = this.validateSize(file),
              type = this.validateTypes(file),
              ext  = this.validateExts(file);

        if (!size || !type || !ext) {
            const e = new FileManagerEvent('invalid', {
                file: file,
                reason: (!size && FileManagerEvent.INVALID_SIZE)
                | (!type && FileManagerEvent.INVALID_TYPE)
                | (!ext && FileManagerEvent.INVALID_EXT)
            });

            this.dispatch(e);

            return false;
        }

        return true;
    };
}

class FileManagerSettings {
    public url;
    public method = "POST";
    public filename;
    public chunkParameter = "chunk";
    public chunksParameter = "chunks";
    public formFileField = "file";
    public maxChunkSize = 1048576;
    public autoStart = true;
    public maxQueue = 6;
    public maxFileSize = 0;
    public allowedExtensions = new Set();
    public allowedTypes = new Set();

    constructor(settings) {
        if (typeof settings !== "object" || typeof settings !== "undefined") {
            throw new TypeError("FileUploadSettings expects an object for construction");
        }

        if (typeof settings === "object") {
            this.url = settings.url || undefined;
            this.method = settings.method || this.method;
            this.filename = settings.filename || undefined;
            this.chunkParameter = settings.chunkParameter || this.chunkParameter;
            this.chunksParameter = settings.chunksParameter || this.chunksParameter;
            this.formFileField = settings.formFileField || this.formFileField;
            this.maxChunkSize = settings.maxChunkSize || this.maxChunkSize;
            this.autoStart = settings.hasOwnProperty('autoStart') ? settings.autoStart : this.autoStart;
            this.maxQueue = settings.maxQueue || this.maxQueue;
            this.maxFileSize = settings.maxFileSize || this.maxFileSize;
        }
    }
}

class FileManagerQueue extends Emitter {
    private _queue = new FileMap();

    add(file) {
        if (!(file instanceof FileUpload)) {
            throw new TypeError("Only FileUpload objects can be added to the queue.");
        }

        file.on('complete', this.removeFile);
        file.on('error', this.removeFile);

        this._queue.add(file);
    }

    remove(file) {
        this._queue.delete(file);

        file.off('complete', this.removeFile);
        file.off('error', this.removeFile);
    }

    start() {
        this._queue.forEach((file) => {
            file.start();
        });
    }

    pause() {
        this._queue.forEach((file) => {
            file.pause();
        });
    }

    clear() {
        this.pause();
        this._queue.forEach((file) => {
            this.remove(file);
        });
    }

    /**
     * Fires when a FileUpload is complete
     * @param {FileUploadEvent} e
     */
    private removeFile(e) {
        this.remove(e.target);
    }
}

export {FileUploadManager, FileManagerSettings, FileManagerQueue};