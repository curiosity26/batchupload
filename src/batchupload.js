/*
    Batch Upload
    ------------
    Author: Alex Boyce (curiosit26@gmail.com)
*/

var extend = function () {
    if (arguments.length === 0) {
        return;
    }

    var ret = Object.create({});

    for (var i = 0; i < arguments.length; i++) {
        for (var n in arguments[i]) {
            ret[n] = arguments[i][n];
        }
    }

    return ret;
};

var uuid = function (){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
};

if (!window.CustomEvent) {
    /**
     * CustomEvent (polyfill)
     * @param event
     * @param params
     * @returns {Event}
     * @constructor
     */
    var CustomEvent = function ( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    };

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
}

var List = function() {
    var list = {
        key: 'this.length',
        length: 0,
        list: {},
        get: function(key) {
          return this.list[key];
        },
        add: function (item) {
            var key = eval(this.key);
            this.list[key] = item;
            ++this.length;

            return this;
        },
        remove: function (item) {
            for (var key in this.list) {
                if (this.list.hasOwnProperty(key) && this.list[key] === item) {
                    delete this.list[key];
                    var tmp = new List(this.key, this.toArray());
                    this.list = tmp.list;
                    this.length = tmp.length;
                    break;
                }
            }
            return this;
        },
        item: function(index) {
            var keys = Object.keys(this.list);
            var key = keys[index];
            return this.list[key];
        },
        clear: function() {
            this.list = {};
            this.length = 0;
            return this;
        },
        toArray: function () {
          var f = function() {
            var ret = [];
            var _self = this;
            Object.keys(this).forEach(function(value) {
              ret.push(_self[value]);
              });
            return ret;
          };
          
          return f.apply(this.list);
        }
    };

    var setItems = function(items) {
        for(var i = 0; i < items.length; i++) {
            list.add(items[i]);
        }
    };

    if (arguments.length == 2) {
        list.key = arguments[1];
        setItems(arguments[0]);
    }
    else if (arguments.length == 1 && typeof arguments[0] === 'string') {
        list.key = arguments[0];
    }
    else if (arguments.length == 1 && arguments[0] instanceof Array) {
        setItems(arguments[0]);
    }

    return list;
};

/**
 * FileUploadEvent
 * @param type
 * @param eventInit
 * @constructor
 */
var FileUploadEvent = function(type, eventInit) {
    var event = extend(FileUploadEvent.DEFAULT, new CustomEvent(type), eventInit);

    event.prototype = CustomEvent.prototype;
    event.constructor = FileUploadEvent;

    return event;
};

FileUploadEvent.DEFAULT = {
    bytesLoaded: 0,
    bytesTotal: 0,
    file: null
};

FileUploadEvent.constructor = CustomEvent;


var FileManagerEvent = function(type, eventInit) {
    var event = extend(FileManagerEvent.DEFAULT, new CustomEvent(type), eventInit);

    event.prototype = CustomEvent.prototype;
    event.constructor = FileManagerEvent;
    return event;
};

FileManagerEvent.DEFAULT = {
    bytesLoaded: 0,
    bytesTotal: 0,
    totalBytesLoaded: 0,
    totalBytesTotal: 0,
    currentTarget: null,
    file: null,
    queue: [],
    errors: [],
    fileList: [],
    completed: [],
    data: null
};

FileManagerEvent.constructor = CustomEvent;

/**
 * EventEmitter
 * @constructor
 */
var EventEmitter = function() {

    this.addEventListener = function(type, listener) {
        if (!this.events[type]) {
            this.events[type] = [];
        }

        this.events[type].push(listener);
    };

    this.removeEventListener = function (type, listener) {
        if (!!this.events[type]) {
            for(var i = 0; i < this.events[type].length; i++) {
                if (this.events[type][i] === listener) {
                    this.events[type][i] = null;
                    this.events[type].splice(i, 1);
                    return;
                }
            }
        }
    };

    this.removeAllListeners = function (type) {
        this.events[type] = [];
    };

    var emit = function(cb, event) {
        // Handle callbacks asynchronously
        setTimeout(function() {
            cb(event);
        }, 0);

    };

    this.dispatchEvent = function (event) {
        if (!!event.type) {
            var type = event.type;
            if (!!this.events[type]) {
                event.target = this;
                for (var i = 0; i < this.events[type].length && (event.returnValue === undefined || event.returnValue) ; i++) {
                    var cb = this.events[type][i];
                    // Dereference cb for async
                    emit(cb.bind(event.target), event);
                }
            }
        }
    };
};

/**
 * FileDropZone
 * @param el
 * @param settings
 * @constructor
 */
var FileDropZone = function(el, settings) {
    this.setSettings(settings);
    this.manager = this.settings.manager || new FileUploadManager(this.settings);
    this.setElement(el);
};

FileDropZone.DEFAULT = {
    url: null,
    method: 'POST',
    manager: null,
    dragOverClass: 'drag-over',
    maxQueue: 6,
    autoStart: true,
    allowedTypes: [],
    allowedExtensions: [],
    maxFileSize: null,
    maxChunkSize: 1048576,
    formFileField: 'file',
    chunkParameter: 'chunk',
    chunksParameter: 'chunks'
};

FileDropZone.prototype.setSettings = function(settings) {
    this.settings = extend(FileDropZone.DEFAULT, settings);
};

FileDropZone.prototype.setElement = function(el) {
    var _self = this;
    this.element = el;

    this.element.addEventListener('dragover', function(event) {
        // Required to allow drop
        event.preventDefault();
    });

    this.element.addEventListener('dragenter', function(event) {
      event.target.className += ' ' + _self.settings.dragOverClass;
    });

    this.element.addEventListener('dragleave', function(event) {
      event.target.className = event.target.className.replace(' ' + _self.settings.dragOverClass, '');
    });

    this.element.addEventListener('drop', function(event) {
        if (!!event.dataTransfer && !!event.dataTransfer.files && event.dataTransfer.files instanceof FileList && event.dataTransfer.files.length > 0) {
            event.preventDefault();
            var files = event.dataTransfer.files;
            
            for (var i = 0; i < files.length; i++) {
              var file = files.item(i);
              _self.manager.addFile(file);
            }

            event.target.className = event.target.className.replace(' ' + _self.settings.dragOverClass, '');
        }
    });
};

/**
 * FileManager
 * @param files
 * @param settings
 * @constructor
 */
var FileUploadManager = function(settings) {
    this.events = [];
    this.setSettings(settings);
    this.bytesLoaded = 0;
    this.bytesTotal = 0;
    this.paused = !this.settings.autoStart;

    var _self = this;
    var _fileList = [];
    var _completed = new List('item.uuid');
    var _errors = new List('item.uuid');
    var _queue = new List('item.uuid');

    var onStart = function(event) {
        var e = new FileManagerEvent('file_start', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: _self.bytesLoaded,
            totalBytesTotal: _self.bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: _queue.toArray(),
            errors: _errors.toArray(),
            fileList: _fileList,
            completed: _completed.toArray()
        });

        _self.dispatchEvent(e);
    };

    var onPause = function(event) {
        var e = new FileManagerEvent('file_pause', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: _self.bytesLoaded,
            totalBytesTotal: _self.bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: _queue.toArray(),
            errors: _errors.toArray(),
            fileList: _fileList,
            completed: _completed.toArray()
        });

        _self.dispatchEvent(e);
    };

    var onProgress = function(event) {
        _self.bytesLoaded += event.bytesLoaded;

        var e = new FileManagerEvent('file_progress', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: _self.bytesLoaded,
            totalBytesTotal: _self.bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: _queue.toArray(),
            errors: _errors.toArray(),
            fileList: _fileList,
            completed: _completed.toArray()
        });

        _self.dispatchEvent(e);
    };

    var onError = function(event) {
        _queue.remove(event.target);
        _errors.add(event.target);

        var e = new FileManagerEvent('file_error', {
            bytesLoaded: 0,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: _self.bytesLoaded,
            totalBytesTotal: _self.bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: _queue.toArray(),
            errors: _errors.toArray(),
            fileList: _fileList,
            completed: _completed.toArray()
        });

        _self.dispatchEvent(e);
        
        queue.apply(_self);
    };

    var onComplete = function(event) {
        _completed.add(event.target);
        _queue.remove(event.target);

        var e = new FileManagerEvent('file_complete', {
            bytesLoaded: event.bytesLoaded,
            bytesTotal: event.bytesTotal,
            totalBytesLoaded: _self.bytesLoaded,
            totalBytesTotal: _self.bytesTotal,
            currentTarget: event.target,
            file: event.file,
            queue: _queue.toArray(),
            errors: _errors.toArray(),
            fileList: _fileList,
            completed: _completed.toArray(),
            data: event.data
        });

        _self.dispatchEvent(e);
        
        queue.apply(_self);
    };

    _queue.add = function(item) {
        if (!!item.uuid) {
            item.addEventListener('start', onStart);
            item.addEventListener('pause', onPause);
            item.addEventListener('progress', onProgress);
            item.addEventListener('error', onError);
            item.addEventListener('complete', onComplete);

            this.list[item.uuid] = item;
            ++this.length;
        }
    };
    _queue.remove = function(item) {
        if (!!item.uuid) {
            item.removeEventListener('start', onStart);
            item.removeEventListener('pause', onPause);
            item.removeEventListener('progress', onProgress);
            item.removeEventListener('error', onError);
            item.removeEventListener('complete', onComplete);

            delete this.list[item.uuid];
            --this.length;
        }
    };

    this.addFile = function(file) {
        if (!file instanceof File || !this.validate(file)) {
            // If it's an actual file, just throw it in the error queue
            if (file instanceof File) {
                _errors.add(file);
            }
            return;
        }

        if (!_fileList) {
            _fileList = [];
        }

        _fileList.push(file);
        
        this.bytesTotal += file.size;

        // Update the queue
        queue.apply(this);

        return this;
    };

    this.setFiles = function(files) {
        if (!files instanceof FileList || !files instanceof Array || files.length === 0) {
            return;
        }

        this.pause();
        _fileList = [];
        var i;

        if (files instanceof FileList) {
            for (i = 0; i < files.length; i++) {
                this.addFile(files.item(i));
            }
        }
        else {
            for (i = 0; i < files.length; i++) {
                this.addFile(files[i]);
            }
        }

        if (this.settings.autoStart == true) {
            this.start();
        }

        return this;
    };

    var queue = function () {
        var _self = this;
        while(_queue.length < _self.settings.maxQueue && _fileList.length > 0) {
            var file = _fileList.shift();
            if (!!file) {
                // Create the FileUpload to queue
                var fu = new FileUpload(file, {
                    url: _self.settings.url,
                    method: _self.settings.method,
                    autoStart: false,
                    maxChunkSize: _self.settings.maxChunkSize,
                    formFileField: _self.settings.formFileField,
                    chunkParameter: _self.settings.chunkParameter,
                    chunksParameter: _self.settings.chunksParameter
                });

                // Update the total queue size
                _self.bytesTotal += file.size;

                // Add the uploader to the queue
                _queue.add(fu);

                // Dispatch an queue event
                _self.dispatchEvent(new FileManagerEvent('queue', {
                    bytesLoaded: 0,
                    bytesTotal: file.size,
                    totalBytesLoaded: _self.bytesLoaded,
                    totalBytesTotal: _self.bytesTotal,
                    currentTarget: fu,
                    queue: _queue.toArray(),
                    file: file,
                    fileList: _fileList,
                    completed: _completed.toArray(),
                    errors: _errors.toArray()
                }));

                // If the manager isn't paused, start the upload
                if (!_self.paused) {
                    fu.start();
                }
            }
        }
    };

    this.start = function() {
        this.paused = false;

        queue.apply(this);
        
        for (var n in _queue.list) {
            _queue.get(n).start();
        }

        this.dispatchEvent(FileManagerEvent('start', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            queue: _queue.toArray(),
            fileList: _fileList,
            completed: _completed.toArray(),
            errors: _errors.toArray()
        }));
    };

    this.pause = function() {
        this.paused = true;
        for (var i = 0; i < _queue.length; i++) {
            _queue[i].pause();
        }

        this.dispatchEvent(new FileManagerEvent('pause', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            queue: _queue.toArray(),
            fileList: _fileList,
            completed: _completed.toArray(),
            errors: _errors.toArray()
        }));
    };
    
    this.clearQueue = function() {
      _queue.clear();
      return this;
    };
    
    this.clearErrors = function() {
      _errors.clear();
      return this;
    };
    
    this.clearCompleted = function() {
      _completed.clear();
      return this;
    }
};

FileUploadManager.DEFAULT = {
    maxQueue: 6,
    url: null,
    method: 'POST',
    autoStart: true,
    allowedTypes: [],
    allowedExtensions: [],
    maxFileSize: null,
    maxChunkSize: 1048576,
    formFileField: 'file',
    chunkParameter: 'chunk',
    chunksParameter: 'chunks'
};

FileUploadManager.prototype = new EventEmitter();
FileUploadManager.constructor = EventEmitter;

FileUploadManager.prototype.validateTypes = function(file) {
  var types = this.settings.allowedTypes;
  
  if (!types || types.length == 0) {
    return true;
  }
  
  var ret = false;
  for (var i = 0; i < types.length; i++) {
    if (file.type == types[i].trim()) {
      ret = true;
      break;
    }
  }
  
  return ret;
};

FileUploadManager.prototype.validateExts = function(file) {
  var exts = this.settings.allowedExtensions;
  if (!exts || exts.length == 0) {
    return true;
  }
  
  var ret = false;
  var parts = file.name.split('.');
  var ext = parts.pop();
  
  for (var i = 0; i < exts.length; i++) {
    if (ext == exts[i].trim()) {
      ret = true;
      break;
    }
  }
  
  return ret;
};
    
FileUploadManager.prototype.validateSize = function(file) {
  var ms = this.settings.maxFileSize;
  if (!ms || isNaN(ms)) {
    return true;
  }
  return file.size <= ms;
};
    
FileUploadManager.prototype.validate = function(file) {
  return this.validateSize(file) && this.validateTypes(file) && this.validateExts(file);
}

FileUploadManager.prototype.setSettings = function(settings) {
    this.settings = extend(FileUploadManager.DEFAULT, settings);

    return this;
};

/**
 * FileUpload
 * @param file
 * @param settings
 * @constructor
 */
var FileUpload = function(file, settings) {

    if (!file instanceof Blob) {
        return;
    }

    if (settings.name == null) {
        settings.filename = file.name;
    }

    this.events = [];

    var _self = this;

    this.setSettings(settings);
    var BYTE_SIZE = this.settings.maxChunkSize;
    this.paused = !this.settings.autoStart;
    this.bytesLoaded = 0;
    this.bytesTotal = file.size;
    this.file = file;
    this.startTime = null;
    this.endTime = null;
    this.chunk = 0;
    this.chunks = Math.ceil(_self.bytesTotal / BYTE_SIZE);

    var upload = function() {
      var _self = this;
        if (!_self.settings.url) {
            return;
        }

        if (!_self.paused) {
            if (_self.bytesLoaded < _self.bytesTotal) {
                ++_self.chunk;
                
                var xhr = new XMLHttpRequest();
                xhr.open(_self.settings.method, _self.settings.url);

                xhr.addEventListener('error', function(e) {
                    _self.dispatchEvent(new FileUploadEvent('error', {
                        bytesLoaded: _self.bytesLoaded,
                        bytesTotal: _self.bytesTotal,
                        filename: _self.settings.filename,
                        file: _self.file,
                        data: typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
                        header: e.responseHeaders
                    }));
                });
                
                xhr.addEventListener('loadstart', function(e) {
                  if (!!e.currentTarget.upload && !!e.currentTarget.upload.addEventListener) {
                    e.currentTarget.upload.addEventListener('progress', function(ue) {
                      var p = ue.loaded / ue.total;
                      _self.bytesLoaded = ((BYTE_SIZE * _self.chunk) * p);
                      if (_self.bytesLoaded > _self.bytesTotal) {
                        _self.bytesLoaded = _self.bytesTotal;
                      }
                      _self.dispatchEvent(new FileUploadEvent('progress', {
                        bytesLoaded: _self.bytesLoaded,
                        bytesTotal: _self.bytesTotal,
                        filename: _self.settings.filename,
                        file: _self.file
                        }));
                      });
                  }
                  });

                xhr.addEventListener('load', function (e) {
                    var xhr = e.currentTarget;
                    
                    if (xhr.status < 200 || xhr.status >= 400) {
                      _self.dispatchEvent(new FileUploadEvent('error', {
                            bytesLoaded: _self.bytesLoaded,
                            bytesTotal: _self.bytesTotal,
                            filename: _self.settings.filename,
                            file: _self.file,
                            data: typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
                            header: e.responseHeaders
                        }));
                      return;
                    }
                    
                    _self.bytesLoaded = BYTE_SIZE * _self.chunk;
                    if (_self.bytesLoaded > _self.bytesTotal) {
                      _self.bytesLoaded = _self.bytesTotal;
                    }
                    
                    _self.dispatchEvent(new FileUploadEvent('progress', {
                        bytesLoaded: _self.bytesLoaded,
                        bytesTotal: _self.bytesTotal,
                        filename: _self.settings.filename,
                        file: _self.file,
                        duration: new Date().getTime() - _self.startTime
                    }));

                    if (_self.chunk < _self.chunks) {
                      if (!_self.paused) {
                        upload.apply(_self);
                      }
                    }
                    else {
                        _self.endTime = new Date().getTime();
                        _self.dispatchEvent(new FileUploadEvent('complete', {
                          bytesLoaded: _self.bytesLoaded,
                          bytesTotal: _self.bytesTotal,
                          filename: _self.settings.filename,
                          file: _self.file,
                          duration: _self.endTime - _self.startTime,
                          data: xhr.getResponseHeader('Content-Type').indexOf('json') > -1 && typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response,
                          header: xhr.responseHeaders
                      }));
                    }
                });

                var fd = new FormData();
                fd.append('filename', _self.settings.filename);
                fd.append(_self.settings.chunkParameter, _self.chunk);
                fd.append(_self.settings.chunksParameter, _self.chunks);
                fd.append(_self.settings.formFileField, _self.file.slice(_self.bytesLoaded, _self.bytesLoaded + BYTE_SIZE), _self.settings.filename);

                xhr.send(fd);
            }
        }
    };

    this.start = function() {
        this.paused = false;
        var now = new Date().getTime();
        if (this.startTime === null) {
            this.startTime = now;
        }
        else {
            this.startTime = now - (this.endTime - this.startTime);
        }

        this.dispatchEvent(new FileUploadEvent('start', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            filename: this.settings.filename,
            file: this.file
        }));
        
        upload.apply(this);

        return this;
    };

    this.pause = function() {
        this.paused = true;
        this.endTime = new Date().getTime();

        this.dispatchEvent(new FileUploadEvent('pause', {
            bytesLoaded: this.bytesLoaded,
            bytesTotal: this.bytesTotal,
            filename: this.settings.filename,
            file: this.file
        }));

        return this;
    };

    this.reset = function() {
        var paused = this.paused;
        this.pause();
        this.chunk = 0;
        this.bytesLoaded = 0;
        this.startTime = new Date().getTime();

        if (!paused) {
            this.start();
        }

        return this;
    }

    this.uuid = uuid();

    if (!this.paused) {
        this.start();
    }
};

FileUpload.DEFAULT = {
    filename: null,
    method: 'POST',
    url: null,
    autoStart: true,
    formFileField: 'file',
    chunkParameter: 'chunk',
    chunksParameter: 'chunks',
    maxChunkSize: 1048576
};

FileUpload.prototype = new EventEmitter();
FileUpload.constructor = EventEmitter;

FileUpload.prototype.setSettings = function(settings) {
    this.settings = extend(FileUpload.DEFAULT, settings);
};

FileUpload.prototype.setUrl = function(url) {
    this.settings.url = url;
};