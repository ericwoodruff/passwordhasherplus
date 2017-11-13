var debug = true;
var webext_storage_ok = false;

function onError(error) {
    console.log(`Error: ${error}`);
}

function saveOptions(area, options) {
    area.set({'options': options}).then(null, onError);
}

function saveConfig(area, url, config) {
    if (debug) console.log ("Saving " + url + " " + JSON.stringify (config));
    config.fields = toArray (config.fields);

    // construct key,value pairs for storage
    var settings = {}
    settings['tag:'+config.tag] = config.policy;
    settings['url:'+url] = config;
    delete settings['url:'+url].policy;
    delete settings['url:'+url].options;

    area.set(settings).then(null, onError);
}

function loadTags(area, resultHandler) {
    area.get(null).then(keys => {
        var tags = [];
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (key.startsWith ("tag:")) {
                tags[tags.length] = key.substringAfter ("tag:");
            }
        }
        resultHandler(tags);
    });
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

function collectGarbage(area) {
    // remove unreferenced tags
    area.get(null).then(keys => {
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (key.startsWith ("tag:")) {
                if (!sTagReferenced (keys, key.substringAfter ("tag:"))) {
                    area.remove(key)
                }
            }
        }
    });
}

function migrate(area) {
    area.get('version').then(results => {
        if (results['version'] == 6) {
            if (debug) console.log('webext storage already contains up-to-date settings');
            webext_storage_ok = true;
        } else {
            if (debug) console.log('migrating settings to webext storage');
            // first make sure that we're on latest config version
            localStorage.migrate();
            // cleanup unused tags
            localStorage.collectGarbage();

            // now construct settings object which we will store in this storage area
            var settings = {};
            settings['version'] = 6;
            // 1. grab options from localStorage
            options = localStorage.loadOptions();
            settings['options'] = options;
            // 2. go through all URLs in localStorage
            settings['url'] = {};
            settings['tag'] = {};
            var keys = toArray(localStorage);
            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                if (debug) console.log('migrating key: '+ key);
                if (key.startsWith('url:')) {
                    var url = key.substringAfter('url:');
                    var config = localStorage.getObject(key);
                    settings['url'][url] = config;
                    var policy = localStorage.getObject('tag:'+config.tag);
                    settings['tag'][config.tag] = policy;
                }
            }
            if (debug) console.log('setting webext storage settings: '+JSON.stringify(settings, null, 2));
            area.set(settings).then(() => { webext_storage_ok = true; }, onError);
        }
    });
}

console.log('Starting migration to webext storage.local');
migrate(browser.storage.local);
