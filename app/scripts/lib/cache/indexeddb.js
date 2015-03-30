var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
    dbVersion = 2.0, db, ready = false,
    URL = window.URL || window.webkitURL;
if (indexedDB) {

    var DBOpenRequest = indexedDB.open("cache_file_db", dbVersion);


    DBOpenRequest.onsuccess = function (event) {
        ready = true;
        // store the result of opening the database in the db variable.
        db = event.target.result;
    };

// This event handles the event whereby a new version of the database needs to be created
// Either one has not been created before, or a new version number has been submitted via the
// window.indexedDB.open line above
    DBOpenRequest.onupgradeneeded = function (event) {
        console.log('upgrade needed');
        var db = event.target.result;

        db.onerror = function (event) {
            console.log('error loading db');
            console.log(event);
        };

        // Create an objectStore for this database

        var objectStore = db.createObjectStore("cache", {keyPath: "path"});
        console.log('object store created');
    };
}

define([], function () {

    return {
        available: !!indexedDB,
        usage: function (callback) {
            var size = 0;
            var transaction = db.transaction(["cache"])
                .objectStore("cache")
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                    var storedObject = cursor.value;
                    size += storedObject.blob.size;
                    delete storedObject.blob;
                    var json = JSON.stringify(storedObject);
                    size += json.length;
                    cursor.continue();
                }
                else {
                    callback(size, null);
                }
            };
        },
        ready: function () {
            return ready;
        },
        store: function (path, blob, cb) {

            try {
                // Open a transaction to the database
                var transaction = db.transaction(["cache"], "readwrite");
                var objectStore = transaction.objectStore("cache")
                var request = objectStore.put({
                    path: path,
                    blob: blob
                });
                request.onsuccess = function (event) {
                    // console.log('request get succes')
                    // console.log(event);
                    cb();
                };
                request.onerror = function (err) {
                    // console.log('request get error')
                    //  console.log(err);
                    cb(err);
                };
                transaction.onerror = function (err) {
                    //   console.log('transacation get error transaction')
                    //   console.log(err);
                    cb(err);
                };

                transaction.onabort = function (event) {
                    var error = event.target.error; // DOMError
                    if (error.name == 'QuotaExceededError') {
                        console.log(' ADD QUOTA')
                    }
                };
            } catch (e) {
                cb(e)
            }
        },
        get: function (path, cb) {
            try {

                // Open a transaction to the database
                var transaction = db.transaction(["cache"], "readwrite");
                var objectStore = transaction.objectStore("cache")
                var request = objectStore.get(path);
                request.onsuccess = function (event) {
                    if (this.result && this.result.blob && this.result.blob.size) {

                        var dataUrl = URL.createObjectURL(this.result.blob);

                        cb(null, dataUrl);
                    } else {
                        cb(null, null);
                    }
                };
                request.onerror = cb;
                transaction.onerror = cb;
            } catch (e) {
                cb(e)
            }
        }
    }
})
