function errorHandler(e) {
    var msg = '';

    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    }
    ;

    console.log('Error: ' + msg);
}
var fs = null;
var ready = false;
function onInitFs(fs_) {
    fs = fs_;
    requestMoreQuota(function (err, res) {
    })

}

function queryUsageAndQuota(cb) {
    navigator.webkitPersistentStorage.queryUsageAndQuota(cb);
}

function requestMoreQuota(cb) {
    navigator.webkitPersistentStorage.queryUsageAndQuota(
        function (used, quota) {

            if (quota && (quota - used > 5 * 1024 * 1024)) {
                cb(null, quota)
            } else {

                navigator.webkitPersistentStorage.requestQuota(quota + 10 * 1024 * 1024,
                    function (grantedBytes) {
                        cb(null, grantedBytes)
                    }, cb)

            }

        }, cb);
}

var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;


function createDir(rootDirEntry, folders, success, error) {
    // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
    if (folders[0] == '.' || folders[0] == '') {
        folders = folders.slice(1);
    }
    rootDirEntry.getDirectory(folders[0], {create: true}, function (dirEntry) {
        // Recursively add the new subfolder (if we still have another to create).
        if (folders.length) {
            createDir(dirEntry, folders.slice(1), success, error);
        } else {
            success(dirEntry)
        }
    }, error);
};

if (requestFileSystem)
    requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024, onInitFs, errorHandler);

define([], function () {
    return {
        available: !!requestFileSystem,
        usage: queryUsageAndQuota,
        ready: function () {
            return ready;
        },
        store: function (file_id, blob, cb) {
            //store blob as a file, store metadata in indexeddb

            if (!fs || !fs.root) {
                cb('no filesystem');
                return;
            }
            var that = this;
            var path = 'cache' + file_id.substring(0, file_id.lastIndexOf('/'));
            ;
            createDir(
                fs.root,
                path.split('/'),
                function (dirEntry) {
                    fs.root.getFile(
                        'cache' + file_id,
                        {create: true},
                        function (fileEntry) {
                            fileEntry.createWriter(function (fileWriter) {

                                fileWriter.onwriteend = function (e) {
                                    cb(null, null);
                                };

                                fileWriter.onerror = cb;

                                fileWriter.write(blob);

                            }, function (err) {
                                console.log('create writer error')
                                console.log(err);
                                if (err.name == 'QuotaExceededError') {
                                    requestMoreQuota(function (quota_err) {
                                        if (quota_err) {
                                            cb(err)
                                        } else {
                                            that.store(file_id, blob, cb)
                                        }
                                    })
                                }
                            });

                        },
                        function (err) {
                            console.log('getFile error')
                            console.log(err);
                            if (err.name == 'QuotaExceededError') {
                                requestMoreQuota(function (quota_err) {
                                    if (quota_err) {
                                        cb(err)
                                    } else {
                                        that.store(file_id, blob, cb)
                                    }
                                })
                            }
                        })

                },
                function (err) {
                    console.log('create dir failed')
                    cb(err);
                });
        },
        get: function (file_id, cb) {
            if (!fs || !fs.root) {
                cb('no filesystem');
                return;
            }
            fs.root.getFile('cache' + file_id, {}, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();

                    reader.onloadend = function (e) {
                        cb(null, this.result)
                    };
                    reader.readAsDataURL(file);
                }, cb);
            }, cb)
        }

    }
})
