/**
 * filemap.js
 * Author: Alex Boyce <curiosity26@gmail.com>
 **/

import {FileUpload} from "./fileupload"

class FileMap extends Map {
    /**
     * add
     * @param {FileUpload} item
     */
    add(item) {
        super.set(item.uuid, item);
    }

    /**
     * set
     * @param key
     * @param {FileUpload} item
     */
    set(key, item) {
        super.set(item.uuid, item);
    }
}

export { FileMap };