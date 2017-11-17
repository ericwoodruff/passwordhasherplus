var debug = true;

var CURRENT_STORAGE_VER = 6;

function onError(error) {
    console.log(`Error: ${error}`);
}

var StorageArea = function(){
    this.storagearea = browser.storage.local;
};

StorageArea.prototype.loadTags = function (resultHandler) {
    this.storagearea.get('tag').then(results => {
        resultHandler(results['tag']);
    });
}

StorageArea.prototype.saveOptions = function (options) {
    this.storagearea.set({'options': options}).then(null, onError);
}

StorageArea.prototype.initOptions = function (settings) {
    var options;
    if (settings && 'options' in settings) {
        options = settings['options'];
    } else {
        options = new Object();
    }
    var dirty = false;
    if (null == options.privateSeed) {
        options.privateSeed = generateGuid ();
        dirty = true;
    }
    if (null == options.defaultLength) {
        options.defaultLength = default_length;
        dirty = true;
    }
    if (null == options.defaultStrength) {
        options.defaultStrength = default_strength;
        dirty = true;
    }
    if (null == options.backedUp) {
        options.backedUp = false;
        dirty = true;
    }
    if (null == options.compatibilityMode) {
        options.compatibilityMode = false;
        dirty = true;
    }
    if (null == options.hashKey) {
        options.hashKey = default_hashkey;
        dirty = true;
    }
    if (null == options.maskKey) {
        options.maskKey = default_maskkey;
        dirty = true;
    }
    if (null == options.sync) {
        options.sync = default_sync;
        dirty = true;
    }
    if (settings) {
        settings['options'] = options;
    }
    return dirty;
}

StorageArea.prototype.loadOptions = function (resultHandler) {
    this.storagearea.get('options').then(results => {
        if (debug) console.log('got options='+JSON.stringify(options,null,2));
        var dirty = this.initOptions(results);
        var options = results['options'];

        if (dirty && results && 'settings' in results) {
            this.saveOptions (options);
        }

	if (debug) console.log('[storageLoadOptions] calling resultHandler with options='+JSON.stringify(options, null, 2));
        resultHandler(options);
    });
}

StorageArea.prototype.saveConfig = function (url, config) {
    if (debug) console.log ("[storagearea.js] Saving " + url + " " + JSON.stringify (config, null, 2));
    config.fields = toArray (config.fields);

    // grab settings from storage area and update
    this.storagearea.get(['url', 'tag']).then(results => {
        if (!('tag' in results)) {
            results.tag = new Object();
        }
        results.tag[config.tag] = config.policy;
        delete config.policy;
        delete config.options;
        if (!('url' in results)) {
            results.url = new Object();
        }
        results.url[url] = config;
        if (debug) console.log ("Writing " + JSON.stringify (results, null, 2));
        this.storagearea.set(results).then(null, onError);
    });

}

StorageArea.prototype.loadConfig = function (url, resultHandler) {
    var config = new Object();
    config.tag = url;
    config.fields = new Array();
    function configSetOptions(options) {
        config.options = options;
        storage.storagearea.get('tag').then(results => {
            if ('tag' in results && config.tag in results['tag']) {
                // found tag settings
                config.policy = results.tag[config.tag];
            } else {
                // init default tag settings
                config.policy = new Object();
                config.policy.seed = config.options.privateSeed;
                config.policy.length = config.options.defaultLength;
                config.policy.strength = config.options.defaultStrength;
            }
            if (debug) console.log('calling result handler with config='+JSON.stringify(config, null, 2));
            resultHandler(config);
        }, onError);
    };

    if (debug) console.log('reading config for url='+url+' from storagearea');
    this.storagearea.get('url').then(results => {
        if ('url' in results && url in results['url']) {
            config = results.url[url];
        } else {
            config = new Object ();
            config.tag = url;
            config.fields = new Array ();
        }
        this.loadOptions(configSetOptions);
    }, onError);
}

// TODO: fix this with new storage format
StorageArea.prototype.isTagReferenced = function (keys, tag) {
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (key.startsWith ("url:")) {
            var config = this.get
            if (config.tag == tag) {
                return true;
            }
        }
    }
    return false;
}

StorageArea.prototype.collectGarbage = function () {
    // remove unreferenced tags
    this.storagearea.get('tag').then(tags => {
        for (var tag in tags) {
            if (!this.isTagReferenced (keys, key.substringAfter ("tag:"))) {
                this.storagearea.remove(key)
            }
        }
    });
}

StorageArea.prototype.migrateLocalStorage = function () {
    if (debug) console.log('migrating settings from localStorage to webext storage');
    // first make sure that we're on latest config version
    localStorage.migrate();
    // cleanup unused tags
    localStorage.collectGarbage();

    var settings = new Object();
    // now construct settings object which we will store in this storage area
    settings['version'] = 6;
    // 1. grab options from localStorage
    options = localStorage.loadOptions();
    settings['options'] = options;
    settings['url'] = new Object();
    settings['tag'] = new Object();
    // 2. go through all URLs in localStorage
    var keys = toArray(localStorage);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (key.startsWith('url:')) {
            if (debug) console.log('migrating settings for: '+ key);
            var url = key.substringAfter('url:');
            var config = localStorage.getObject(key);
            settings['url'][url] = config;
            var policy = localStorage.getObject('tag:'+config.tag);
            settings['tag'][config.tag] = policy;
        }
    }
    return settings;
}

StorageArea.prototype.migrateArea = function (sync, doneHandler) {
    function doMigration() {
        oldstoragearea.get(null).then(results => {
            this.storagearea.set(results).then(() => {
                // clear old storage area
                oldstoragearea.clear();
                // if we're using sync, remember in local storage
                if (sync) {
                    browser.storage.local.set({sync: true});
                }
                doneHandler();
            });
        });
    }

    // check if we need to do anything:
    // storage area, sync flag, op
    //    sync         true     noop
    //    sync         false    migrate to local
    //    local        true     migrate to sync
    //    local        false    noop
    if ((this.storagearea == browser.storage.sync) != sync) {
        var oldstoragearea = this.storagearea;
        if (sync) {
            this.storagearea = browser.storage.sync;
            // TODO: ask user what to do, and implement optional merging of
            // local and sync area
            console.log("checking if sync already contains settings");
            this.storagearea.get('version').then(results => {
                if(results['version'] == CURRENT_STORAGE_VER) {
                    console.log('sync already has config, switching sync on, but not pushing local config into sync!');
                    browser.storage.local.set({sync: true}).then(() => { doneHandler(); });
                } else {
                    doMigration();
                }
            });
            return;
        } else {
            this.storagearea = browser.storage.local;
        }
        doMigration();
    } else {
        // nothing to do, just call callback
        doneHandler();
    }
}

StorageArea.prototype.migrate = function (area) {
    area.get(null).then(results => {
        if (results['version'] == CURRENT_STORAGE_VER && area == this.storagearea) {
            if (debug) console.log('webext storage already contains up-to-date settings');
            return;
        }
        // we need to do some work
        var settings;
        if (results['version'] == CURRENT_STORAGE_VER) {
            if (debug) console.log('migrating settings from ' + this.storagearea + ' to ' + area);
            settings = results;
        } else {
            settings = this.migrateLocalStorage();
        }
	if (!('options' in settings)) {
            console.log('no options in settings to migrate?');
            settings['options'] = this.initOptions(settings);
        }
        if (debug) console.log('setting webext storage settings: '+
                JSON.stringify(settings, null, 2));
        area.set(settings).then(() => {
            this.storagearea = area;
            console.log('storage:'+JSON.stringify(storage, null, 2));
        }, onError);
    });
}

StorageArea.prototype.init = function (settings) {
    if (settings['sync']) {
        this.storagearea = browser.storage.sync;
    } else {
        this.storagearea = browser.storage.local;
    }
    // clear new storagearea
    this.storagearea.clear ();
    return this.storagearea.set(settings)
}

var storage = new StorageArea();

// make sure settings are available in webext storage after plugin install / plugin reload
function install_handler() {
    if (debug) console.log('Initializing webext storage...');
    browser.storage.local.get('sync').then(
            results => {
                if (results['sync']) {
                    storage.migrate(browser.storage.sync);
                } else {
                    storage.migrate(browser.storage.local);
                }
            });
}
browser.runtime.onInstalled.addListener(install_handler);

// make sure settings are read from correct webext storage after browser start
function startup_handler() {
    browser.storage.local.get('sync').then(
            results => {
                if (results['sync']) {
                    storage.storagearea = browser.storage.sync;
                } else {
                    storage.storagearea = browser.storage.local;
                }
            });
}
browser.runtime.onStartup.addListener(startup_handler);
