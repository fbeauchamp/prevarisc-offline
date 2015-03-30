define([
    'lib/cache/filesystem',
    'lib/cache/indexeddb'
], function (FileSystem, IndexedDb) {
//from http://www.html5rocks.com/en/tutorials/offline/quota-research/
    if (FileSystem.available) { //no limits on chrome
        console.log('filesystem storage')
        return FileSystem;
    }
    if (IndexedDb.available) { //no limits on firefox
        return IndexedDb;
    }

    //@todo add a prune stra tegy
    return {
        ready: function () {
            return false;
        },
        store: function (file_id, blob, cb) {
            cb(new Error('no cache storage engine'))
        },
        get: function (file_id, cb) {
            cb(new Error('no cache storage engine'))
        }
    }
})
