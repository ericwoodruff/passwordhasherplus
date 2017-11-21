var debug = false;

// TODO: update to storage version 7?
var CURRENT_STORAGE_VER = 6;

function onError(error) {
    console.log(`Error: ${error}`);
}

function StorageArea(){
    "use strict"
};

StorageArea.prototype.loadTags = function (resultHandler) {
    select_storage_area().then(storagearea => {
        storagearea.get('tag').then(results => {
            resultHandler(results['tag']);
        });
    });
}

StorageArea.prototype.saveOptions = function (options, doneHandler) {
    if ('sync' in options) {
        delete options['sync'];
    }
    select_storage_area().then(storagearea => {
        storagearea.set({'options': options}).then(doneHandler, onError);
    });
}

StorageArea.prototype.initOptions = function (settings) {
    var options;
    if (settings && settings.options !== undefined) {
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
    if (settings) {
        settings['options'] = options;
    }
    return dirty;
}

StorageArea.prototype.loadOptions = function (resultHandler) {
    select_storage_area().then(storagearea => {
        storagearea.get(['options', 'sync']).then(results => {
            if (debug) {
                console.log("[storagearea.js:loadOptions]");
                console.dir(results);
            }
            var dirty = this.initOptions(results);
            if (debug) console.log('[loadOptions] initOptions -> ' + dirty);
            var options = results['options'];
            console.assert(options !== undefined);

            // inject sync for options page and stuff
            if (results.sync === undefined) {
                results.sync = options.sync;
                dirty = true;
                delete options.sync;
                storagearea.set({sync: results.sync});
            }

            if (dirty) {
                if (debug) console.log("options updated, saving");
                this.saveOptions (options);
            }

            options.sync = results['sync'];

            if (debug) console.log('[storageLoadOptions] calling resultHandler with options='+JSON.stringify(options, null, 2));
            resultHandler(options);
        });
    });
}

StorageArea.prototype.saveConfig = function (url, config, doneHandler) {
    if (debug) console.log ("[storagearea.js] Saving " + url + " " + JSON.stringify (config, null, 2));
    config.fields = toArray (config.fields);

    // grab settings from storage area and update
    select_storage_area().then(storagearea => {
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
            //if (debug) console.log ("Writing " + JSON.stringify (results, null, 2));
            storagearea.set(results).then(doneHandler, onError);
        });
    });
}

StorageArea.prototype.loadConfig = function (url, resultHandler) {
    var config = new Object();
    config.tag = url;
    config.fields = new Array();
    function configSetOptions(options) {
        config.options = options;
        select_storage_area().then(storagearea => {
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
        });
    };

    if (debug) console.log('reading config for url='+url+' from storagearea');
    select_storage_area().then(storagearea => {
        storagearea.get('url').then(results => {
            if ('url' in results && url in results['url']) {
                config = results.url[url];
            } else {
                config = new Object ();
                config.tag = url;
                config.fields = new Array ();
            }
            this.loadOptions(configSetOptions);
        }, onError);
    });
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
    select_storage_area().then(storagearea => {
        storagearea.get('tag').then(tags => {
            for (var tag in tags) {
                if (!this.isTagReferenced (keys, key.substringAfter ("tag:"))) {
                    storagearea.remove(key)
                }
            }
        });
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
    var options = localStorage.loadOptions();
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

// Possible syncopt values:
// 0: use existing sync settings if available, move local settings to sync otherwise
// 1: Overwrite existing sync settings
// 2: merge local settings with sync settings -- local options take precedence
// 3: merge local settings with sync settings -- sync options take precedence
StorageArea.prototype.migrateArea = function (sync, syncopt, doneHandler) {
    function doMigration(oldarea, area, syncval) {
        oldarea.get(null).then(results => {
            // update sync field
            results.sync = syncval;
            if (debug) {
                console.log('[migrateArea] storing');
                console.dir(results);
            }
            area.set(results).then(() => {
                // update top-level sync flag in local storage
                browser.storage.local.set({sync: syncval});
                doneHandler();
            });
        });
    }

    function doMerge(oldarea, area, syncval, syncoptval) {
        if (debug) console.log('[migrateArea:doMerge] sync='+syncval+' syncopt='+syncoptval);
        console.assert(!'NYI');
        return;
    }

    // check if we need to do anything:
    // storage area, sync flag, op
    //    sync         true     noop
    //    sync         false    migrate to local
    //    local        true     migrate to sync
    //    local        false    noop
    select_storage_area().then(oldstoragearea => {
        if ((oldstoragearea == browser.storage.sync) != sync) {
            if (sync) {
                var storagearea = browser.storage.sync;
                console.log("checking if sync already contains settings");
                storagearea.get('version').then(results => {
                    console.log('migrate: results='+JSON.stringify(results, null, 2));
                    if(results['version'] == CURRENT_STORAGE_VER) {
                        console.log('sync already has config');
			if (syncopt == 0) {
                            console.log('user requested to use settings in sync');
                            console.log('setting local.sync = ' + sync);
                            browser.storage.local.set({sync: sync}).then(() => {
                                browser.storage.sync.set({sync: sync}).then(doneHandler);
                            });
			} else if (syncopt == 1) {
                            console.log('user requested to overwrite sync with local');
                            doMigration(oldstoragearea, storagearea, sync);
                        } else if (syncopt == 2 || syncopt == 3) {
                            console.log('user requested to merge local and sync');
                            console.log('merge: keep ' + (syncopt == 3 ? 'sync' : 'local') + ' options');
                            doMerge(oldstoragearea, storagearea, sync, syncopt);
                        } else {
                            console.warn("syncopt = " + syncopt + " unknown");
                        }
                        return;
                    } else {
                        console.log('No settings present in sync, writing local settings to sync');
                        doMigration(oldstoragearea, storagearea, sync);
                    }
                });
                return;
            } else if (!overwrite) {
                console.log("User selected local storage, and did not request overwrite");
                browser.storage.local.set({sync: sync}).then(doneHandler);
                return;
            } else {
                doMigration(browser.storage.sync, browser.storage.local, sync);
            }
        } else {
            // nothing to do, just call callback
            doneHandler();
        }
    });
}

StorageArea.prototype.migrate = function (area) {
    console.assert(area !== null);
    area.get(null).then(results => {
        if ('version' in results && results['version'] == CURRENT_STORAGE_VER)
        {
            if (debug) console.log('webext storage already contains up-to-date settings');
            return;
        }
        // we need to do some work
        var settings;
        if ('version' in results && results['version'] == CURRENT_STORAGE_VER) {
            if (debug) console.log('migrating settings to ' + area);
            settings = results;
        } else {
            settings = this.migrateLocalStorage();
        }
	if (!('options' in settings)) {
            console.log('no options in settings to migrate?');
            settings['options'] = this.initOptions(settings);
        }
        if (debug) console.log('setting webext storage settings: '+ JSON.stringify(settings, null, 2));
        area.set(settings).then(null, onError);
    });
}

StorageArea.prototype.init = function (settings) {
    if (settings['sync']) {
        storagearea = browser.storage.sync;
    } else {
        storagearea = browser.storage.local;
    }
    storagearea.clear ();
    return browser.storage.local.set({sync: settings['sync']}).then(() => {
        // clear selected storagearea
        return storagearea.set(settings)
    });
}

var storage = new StorageArea();

// make sure settings are available in webext storage after plugin install / plugin reload
function install_handler() {
    if (debug) console.log('Initializing webext storage...');
    browser.storage.local.get('sync').then(
            results => {
                var sync = 'sync' in results && results['sync'] > 0;
                if (debug) {
                    console.log("storage.local.sync = " + sync);
                    browser.storage.sync.get(null).then(results => {
                        console.log("sync: "+JSON.stringify(results, null, 2));
                    });
                }
                if (sync) {
                    storage.migrate(browser.storage.sync);
                } else {
                    storage.migrate(browser.storage.local);
                }
            });
}
browser.runtime.onInstalled.addListener(install_handler);

if (typeof exports !== 'undefined') {
    exports.StorageArea = StorageArea;
}
