var debug = true;

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

function initOptions(settings) {
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
                console.log("[storagearea.js:loadOptions] sync="+results.sync);
                console.dir(results);
            }
            var dirty = initOptions(results);
            if (debug) console.log('[loadOptions] initOptions -> ' + dirty);
            var options = results['options'];
            console.assert(options !== undefined);

            // inject sync for options page and stuff
            if (results.sync === undefined) {
                if (options.sync !== undefined) {
                    results.sync = options.sync;
                    delete options.sync;
                } else {
                    results.sync = false;
                }
                dirty = true;
                console.log("[loadOptions] sync was undefined, setting sync to " + results.sync);
                browser.storage.local.set({sync: results.sync}).then(() => {
                    browser.storage.sync.set({sync: results.sync});
                });
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

StorageArea.prototype.collectGarbage = function (doneHandler) {
    function isTagReferenced (urls, tagn) {
        for (var urln in urls) {
            var url = urls[urln];
            if (url.tag == tagn) {
                return true;
            }
        }
        return false;
    }

    // remove unreferenced tags
    select_storage_area().then(storagearea => {
        storagearea.get(['tag', 'url']).then(results => {
            console.dir(results.url);
            for (var tag in results.tag) {
                if (!isTagReferenced (results.url, tag)) {
                    console.log("tag '"+ tag+ "' not referenced, deleting it");
                    delete results.tag[tag];
                }
            }
            if (debug) {
                console.log("[storagearea:collectGarbage] writing back clean settings");
                console.dir(results);
            }
            storagearea.set(results).then(doneHandler);
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
    console.log("[storagearea.js:migrateArea] sync="+sync+", syncopt="+syncopt);
    function saveToArea(area, syncval, settings, mDoneHandler) {
        browser.storage.local.set({sync: syncval}).then(() => {
            browser.storage.sync.set({sync: syncval}).then(() => {
                area.set(settings).then(() => {
                    storage.collectGarbage();
                    storage.saveOptions(settings.options);
                    mDoneHandler();
                });
            });
        });
    }

    function doMigration(oldarea, area, syncval, mDoneHandler) {
        oldarea.get(null).then(results => {
            // update sync field
            results.sync = syncval;
            if (debug) {
                console.log('[migrateArea] storing');
                console.dir(results);
            }
            saveToArea(area, syncval, results, mDoneHandler);
        });
    }

    function doMerge(area, syncval, syncoptval, mDoneHandler) {
        if (debug) console.log('[migrateArea:doMerge] sync='+syncval+' syncopt='+syncoptval);
        var masterarea = null;
        var slavearea = null;
        var masterareaname = null;
        if (syncoptval == 2) {
            masterarea = browser.storage.local;
            slavearea = browser.storage.sync;
            masterareaname = 'local';
        } else if (syncoptval == 3) {
            masterarea = browser.storage.sync;
            slavearea = browser.storage.local;
            masterareaname = 'sync';
        } else {
            console.warn("[migrateArea:doMerge] unknown syncopt: " + syncoptval);
            console.assert(!"Fallback NYI");
            return;
        }
        masterarea.get(null).then(results => {
            slavearea.get(null).then(slaveres => {
                if (results.options === null) {
                    if (slaveres.options !== null) {
                        console.log('no options in preferred storage, using options from other storage');
                        results.options = slaveres.options;
                    } else {
                        console.log("no options available, generating initial options");
                        initOptions(results);
                    }
                }
                // now resuls.options == requested options
                // merge urls in slaveres.url which don't exist in results.url
                if (!(url in results)) {
                    if (debug) console.log("no urls in "+masterareaname);
                    results.url = slaveres.url;
                } else {
                    for (var url in slaveres.url) {
                        if (!(url in results.url)) {
                            results.url[url] = slaveres.url[url];
                        }
                    }
                }
                // merge tags in slaveres.tag which don't exist in results.tag
                if (!(tag in results)) {
                    if (debug) console.log("no tags in "+masterareaname);
                    results.tag = slaveres.tag;
                } else {
                    for (var tag in slaveres.tag) {
                        if (!(tag in results.tag)) {
                            results.tag[tag] = slaveres.tag[tag];
                        }
                    }
                }
                if (debug) {
                    console.log('merged settings:');
                    console.dir(results);
                }
                saveToArea(area, syncval, results, mDoneHandler);
            });
        });
    }

    // check if we need to do anything:
    // storage area, sync flag, op
    //    sync         true     noop
    //    sync         false    migrate to local
    //    local        true     migrate to sync
    //    local        false    noop
    select_storage_area().then(oldstoragearea => {
        if ((oldstoragearea == browser.storage.sync) != sync) {
            var storagearea = null;
            var areaname = null;
            // select new storagearea
            if (sync) {
                storagearea = browser.storage.sync;
                areaname = 'sync';
            } else {
                storagearea = browser.storage.local;
                areaname = 'local';
            }
            // use the same logic now that we have properly set storageareas
            console.log("checking if "+areaname+" already contains settings");
            storagearea.get(['version', 'options']).then(results => {
                if(results['version'] == CURRENT_STORAGE_VER) {
                    console.log(areaname + ' already has config');
                    if (syncopt == 0) {
                        console.log('user requested to use settings in ' + areaname);
                        console.log('setting both sync flags to ' + sync);
                        browser.storage.local.set({sync: sync}).then(() => {
                            browser.storage.sync.set({sync: sync}).then(() => {
                                storage.collectGarbage();
                                storage.saveOptions(results.options);
                                doneHandler();
                            });
                        });
                    } else if (syncopt == 1) {
                        console.log('user requested to overwrite ' + areaname);
                        doMigration(oldstoragearea, storagearea, sync, doneHandler);
                    } else if (syncopt == 2 || syncopt == 3) {
                        console.log('user requested to merge configs');
                        console.log('merge: user requested to keep ' + (syncopt == 3 ? 'sync' : 'local') + ' options');
                        doMerge(storagearea, sync, syncopt, doneHandler);
                    } else {
                        console.warn("syncopt = " + syncopt + " unknown");
                    }
                    return;
                } else {
                    console.log('No settings present in ' + area +', writing current settings to ' + area);
                    doMigration(oldstoragearea, storagearea, sync, doneHandler);
                }
            });
        } else {
            if (syncopt == 2 || syncopt == 3) {
                console.log('user requested merge without switching area');
                doMerge(oldstoragearea, sync, syncopt, doneHandler);
            } else {
                // nothing to do, make sure sync flag is correct
                browser.storage.local.set({sync: sync}).then(() => {
                    browser.storage.sync.set({sync: sync}).then(doneHandler);
                });
            }
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
            settings['options'] = initOptions(settings);
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
