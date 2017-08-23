/**
 * filemap.js
 * Author: Alex Boyce <curiosity26@gmail.com>
 **/

class FileMap extends Map {
    public set(value) {
        super.set(value.uuid, value);
    }
}

export { FileMap };