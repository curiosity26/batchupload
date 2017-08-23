/**
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-24
 **/

import uuid from "uuid";
import { FileUploadEvent, Emitter } from "../event";

class FileUpload extends Emitter{
    private _file;
    private _paused = false;
    private _byte_size = 1048576;
    private _bytesLoaded = 0;
    private _bytesTotal = 0;
    private _startTime;
    private _endTime;
    private _chunk = 0;
    private _chunks = 0;
    private _uuid = uuid();
    private _settings = new FileUploadSettings();

    constructor(file, settings) {
        super();

        this.file = file;
        if (settings instanceof FileUploadSettings) {
            this._settings = settings;
        } else {
            this._settings = new FileUploadSettings(settings);
        }

        if (!this.settings.filename) {
            this._settings.filename = file.name;
        }
    }

    get file() {
        return this._file;
    }

    set file(file) {
        if (!(file instanceof File)) {
            throw new TypeError("The file must be a valid File object.");
        }

        this._file = file;
        this._bytesTotal = file.size;
        this._bytesLoaded = 0;
        this._chunk = 0;
        this._chunks = Math.ceil(this.bytesTotal / this.BYTE_SIZE);
    }

    get paused() {
        return this._paused === true;
    }

    get BYTE_SIZE() {
        return this._byte_size;
    }

    get bytesLoaded() {
        return this._bytesLoaded;
    }

    get bytesTotal() {
        return this._bytesTotal;
    }

    get startTime() {
        return this._startTime;
    }

    get endTime() {
        return this._endTime;
    }

    get chunk() {
        return this._chunk;
    }

    get chunks() {
        return this._chunks;
    }

    get uuid() {
        return this._uuid;
    }

    get settings() {
        return this._settings;
    }

    pause() {
        this._paused = true;

        this._endTime = new Date().getTime();

        this.dispatch(new FileUploadEvent('pause', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            filename: this.settings.filename,
            file: this.file
        }));

        return this;
    }

    start() {
        this._paused = false;

        const now = new Date().getTime();

        if (this.startTime === null) {
            this._startTime = now;
        }
        else {
            this._startTime = now - (this.endTime - this.startTime);
        }

        this.dispatch(new FileUploadEvent('start', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            filename: this.settings.filename,
            file: this.file
        }));

        this.upload();

        return this;
    }

    private upload() {
        if (!this.settings.url) {
            throw new Error("An upload URL is required.");
        }

        if (!this.paused && this.bytesLoaded < this.bytesTotal) {
            ++this._chunk;

            const xhr = new XMLHttpRequest();
            xhr.open(this.settings.method, this.settings.url);

            xhr.addEventListener('error', (e) => {
                this.dispatch(new FileUploadEvent('error', {
                    bytesLoaded: this.bytesLoaded,
                    bytesTotal: this.bytesTotal,
                    filename: this.settings.filename,
                    file: this.file,
                    data: typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
                    header: e.responseHeaders
                }));
            });

            xhr.addEventListener('loadstart', (e) => {
                if (!!e.currentTarget.upload && !!e.currentTarget.upload.addEventListener) {
                    e.currentTarget.upload.addEventListener('progress', (ue) => {
                        const p = ue.loaded / ue.total;
                        this._bytesLoaded = ((this.BYTE_SIZE * this.chunk) * p);
                        if (this.bytesLoaded > this.bytesTotal) {
                            this._bytesLoaded = this.bytesTotal;
                        }

                        this.dispatch(new FileUploadEvent('progress', {
                            bytesLoaded: this.bytesLoaded,
                            bytesTotal: this.bytesTotal,
                            filename: this.settings.filename,
                            file: this.file
                        }));
                    });
                }
            });

            xhr.addEventListener('load', (e) => {
                const xhr = e.currentTarget;

                if (xhr.status < 200 || xhr.status >= 400) {
                    this.dispatch(new FileUploadEvent('error', {
                        bytesLoaded: this.bytesLoaded,
                        bytesTotal: this.bytesTotal,
                        filename: this.settings.filename,
                        file: this.file,
                        data: typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
                        header: e.responseHeaders
                    }));
                    return;
                }

                this._bytesLoaded = this.BYTE_SIZE * this.chunk;
                if (this.bytesLoaded > this.bytesTotal) {
                    this._bytesLoaded = this.bytesTotal;
                }

                this.dispatch(new FileUploadEvent('progress', {
                    bytesLoaded: this.bytesLoaded,
                    bytesTotal: this.bytesTotal,
                    filename: this.settings.filename,
                    file: this.file,
                    duration: new Date().getTime() - this.startTime
                }));

                if (this.chunk < this.chunks) {
                    if (!this.paused) {
                        this.upload();
                    }
                }
                else {
                    this._endTime = new Date().getTime();
                    this.dispatch(new FileUploadEvent('complete', {
                        bytesLoaded: this.bytesLoaded,
                        bytesTotal: this.bytesTotal,
                        filename: this.settings.filename,
                        file: this.file,
                        duration: this.endTime - this.startTime,
                        data: xhr.getResponseHeader('Content-Type').indexOf('json') > -1
                            && typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response,
                        header: xhr.responseHeaders
                    }));
                }
            });

            const fd = new FormData();
            fd.append('filename', this.settings.filename);
            fd.append(this.settings.chunkParameter, this.chunk);
            fd.append(this.settings.chunksParameter, this.chunks);
            fd.append(this.settings.formFileField,
                this.file.slice(this.bytesLoaded, this.bytesLoaded + this.BYTE_SIZE), this.settings.filename);

            xhr.send(fd);
        }
    }
}

class FileUploadSettings {
    public url;
    public method = "POST";
    public filename;
    public chunkParameter = "chunk";
    public chunksParameter = "chunks";
    public formFileField = "file";
    public maxChunkSize = 1048576;
    public autoStart = true;

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
        }
    }
}

export { FileUpload, FileUploadSettings };