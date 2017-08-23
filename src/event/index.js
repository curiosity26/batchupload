/**
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-03
 **/

import FileMap from '../type/filemap';

class Emitter {
    private events = new Map();

    on(type, listener) {
        if (!this.events.has(type)) {
            this.events.set(type, new Set());
        }

        this.events.get(type).add(listener);
    };

    off(type, listener) {
        const events = this.events.get(type);
        if (!!events) {
            events.delete(listener);
        }
    };

    clear(type) {
        if (!type) {
            this.events = new Map();
        } else {
            this.events.set(type, new Set());
        }
    };

    private emit(cb, event) {
        // Handle callbacks asynchronously
        setTimeout(function() {
            cb(event);
        }, 0);

    };

    dispatch(event) {
        if (!!event.type) {
            const type = event.type;
            if (this.events.has(type)) {
                event.target = this;
                this.events.get(type).forEach((cb) => {
                    this.emit(cb.bind(event.target), event);
                });
            }
        }
    };
}

class FileManagerEvent extends CustomEvent {
    static get INVALID_SIZE() {
        return 1;
    }

    static get INVALID_TYPE() {
        return 2;
    }

    static get INVALID_EXT() {
        return 4;
    }

    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.bytesLoaded = eventInitDict.bytesLoaded || 0;
        this.bytesTotal = eventInitDict.bytesTotal || 0;
        this.totalBytesLoaded = eventInitDict.totalBytesLoaded || 0;
        this.totalBytesTotal = eventInitDict.totalBytesTotal || 0;
        this.currentTarget = eventInitDict.currentTarget || null;
        this.file = eventInitDict.file || null;
        this.queue = eventInitDict.queue || new FileMap();
        this.errors = eventInitDict.errors || new FileMap();
        this.fileList = eventInitDict.fileList || new FileMap();
        this.completed = eventInitDict.completed || new FileMap();
        this.data = eventInitDict.data || null;
        this.fileError = eventInitDict.fileError || null;
    }
}

class FileUploadEvent extends CustomEvent {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.bytesLoaded = eventInitDict.bytesLoaded || 0;
        this.bytesTotal = eventInitDict.bytesTotal || 0;
        this.file = eventInitDict.file || null;
        this.filename = eventInitDict.filename || null;
        this.data = eventInitDict.data || null;
        this.header = eventInitDict.header || null;
        this.duration = eventInitDict.duration || 0;
    }
}

export { Emitter, FileManagerEvent, FileUploadEvent };