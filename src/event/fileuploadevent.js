/**
 * fileuploadevent.js
 * Author: Alex Boyce <curiosity26@gmail.com>
 * Date: 2017-08-13
 **/

class FileUploadEvent extends CustomEvent {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.bytesLoaded = eventInitDict.bytesLoaded || 0;
        this.bytesTotal = eventInitDict.bytesTotal || 0;
        this.file = eventInitDict.file || null;
        this.filename = eventInitDict.filename || null;
        this.data = eventInitDict.data || null;
        this.header = eventInitDict.header || null;
    }
}

export { FileUploadEvent };