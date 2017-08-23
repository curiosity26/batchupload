/**
 * filemap.js
 * Author: Alex Boyce <curiosity26@gmail.com>
 **/

class FileMap extends Map {
    set(value) {
        super.set(value.uuid, value);
    }
}