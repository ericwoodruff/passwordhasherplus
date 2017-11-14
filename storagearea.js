// default to local storage, user can choose to use sync storage.
var storagearea = browser.storage.local;

var debug = true;
var webext_storage_ok = false;

function onError(error) {
    console.log(`Error: ${error}`);
}

function storageLoadTags(resultHandler) {
    storagearea.get('tag').then(results => {
        resultHandler(results['tag']);
    });
}

function storageSaveOptions(options) {
    storagearea.set({'options': options}).then(null, onError);
}

function storageLoadOptions(resultHandler) {
    storagearea.get('options').then(results => {
        if (debug) console.log('got options='+JSON.stringify(options,null,2));
        var options;
        if (results && 'options' in results) {
            options = results['options']
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
        if (dirty) {
            storageSaveOptions (options);
        }

        resultHandler(options);
    });
}

function storageSaveConfig(url, config) {
    if (debug) console.log ("[storagearea.js] Saving " + url + " " + JSON.stringify (config, null, 2));
    config.fields = toArray (config.fields);

    // grab settings from storage area and update
    storagearea.get(['url', 'tag']).then(results => {
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
        storagearea.set(results).then(null, onError);
    });

}

function storageLoadConfig(url, resultHandler) {
    var config = new Object();
    config.tag = url;
    config.fields = new Array();
    function configSetOptions(options) {
        if (debug) {
            console.log('got options='+JSON.stringify(options, null, 2));
            console.log('setting options on config='+JSON.stringify(config, null, 2));
        }
        config.options = options;
        storagearea.get('tag').then(results => {
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
    storagearea.get('url').then(results => {
        if (debug) console.log('got results: '+JSON.stringify(results, null, 2));
        if ('url' in results && url in results['url']) {
            config = results.url[url];
        } else {
            config = new Object ();
            config.tag = url;
            config.fields = new Array ();
        }
        storageLoadOptions(configSetOptions);
    }, onError);
}

function isTagReferenced(keys, tag) {
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (key.startsWith ("url:")) {
            var config = localStorage.getObject (key);
            if (config.tag == tag) {
                return true;
            }
        }
    }
    return false;
}

function storageCollectGarbage() {
    // remove unreferenced tags
    storagearea.get(null).then(keys => {
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (key.startsWith ("tag:")) {
                if (!isTagReferenced (keys, key.substringAfter ("tag:"))) {
                    area.remove(key)
                }
            }
        }
    });
}

function migrateLocalStorage() {
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

function storageMigrateArea(sync, doneHandler) {
    // check if we need to do anything:
    // storage area, sync flag, op
    //    sync         true     noop
    //    sync         false    migrate to local
    //    local        true     migrate to sync
    //    local        false    noop
    if ((storagearea == browser.storage.sync) != sync) {
        var oldstoragearea = storagearea;
        if (sync) {
            storagearea = browser.storage.sync;
        } else {
            storagearea = browser.storage.local;
        }
        oldstoragearea.get(null).then(results => {
            storagearea.set(results).then(() => {
                // clear old storage area
                oldstoragearea.clear();
                // if we're using sync, remember in local storage
                if (sync) {
                    browser.storage.local.set({sync: true});
                }
                doneHandler();
            });
        });
    } else {
        // nothing to do, just call callback
        doneHandler();
    }
}

function storageMigrate(area) {
    area.get('version').then(results => {
        if (results['version'] == 6 && area == storagearea) {
            if (debug) console.log('webext storage already contains up-to-date settings');
            webext_storage_ok = true;
            return;
        }
        // we need to do some work
        var settings;
        if (results['version'] == 6) {
            if (debug) console.log('migrating settings from ' + storagearea + ' to ' + area);
            settings = storagearea.get(null);
        } else {
            settings = migrateLocalStorage();
        }
        storageLoadOptions((opts) => {
            settings['options'] = opts;
            // save to new area and update storagearea variable
            if (debug) console.log('setting webext storage settings: '+
                    JSON.stringify(settings, null, 2));
            area.set(settings)
                .then(() => {
                    webext_storage_ok = true;
                    storagearea = area;
                }, onError);
        });
    });
}

function storageInit(settings) {
    if (settings['sync']) {
        storagearea = browser.storage.sync;
    } else {
        storagearea = browser.storage.local;
    }
    // clear new storagearea
    storagearea.clear ();
    return storagearea.set(settings)
}

// make sure settings are available in webext storage after plugin install / plugin reload
function install_handler() {
    if (debug) console.log('Initializing webext storage...');
    browser.storage.local.get('sync').then(
            results => {
                if (results['sync']) {
                    storageMigrate(browser.storage.sync);
                } else {
                    storageMigrate(browser.storage.local);
                }
            });
}
browser.runtime.onInstalled.addListener(install_handler);

// make sure settings are read from correct webext storage after browser start
function startup_handler() {
    browser.storage.local.get('sync').then(
            results => {
                if (results['sync']) {
                    storagearea = browser.storage.sync;
                } else {
                    storagearea = browser.storage.local;
                }
            });
}
browser.runtime.onStartup.addListener(startup_handler);
