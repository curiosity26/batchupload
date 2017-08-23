/**
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-24
 **/
import {Emitter, FileManagerEvent} from "../event";
import {FileMap} from "../type/filemap";

class FileUploadManager extends Emitter {
    private _settings = new FileManagerSettings();
    private _files = new Set();
    private _queue = new FileMap();
    private _completed = new FileMap();
    private _errors = new FileMap();


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