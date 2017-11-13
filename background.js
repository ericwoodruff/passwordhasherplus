var ports = {};

function refreshTabs () {
	var keys = toArray (ports);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		var port = ports[key];
		if (debug) console.log ("Loading " + port.passhashUrl + " for " + key);
		storageLoadConfig(port.passhashUrl, config => {
			port.postMessage ({ update: config });
		});
	}
}

function saveConfig (url, config) {
    if (debug) console.log('[background.js] Saving config for url='+url+': config='+JSON.stringify(config, null, 2));
    storageSaveConfig(url, config);
    refreshTabs ();
}
chrome.runtime.onConnect.addListener (function (port) {
	console.assert (port.name == "passhash");
	port.onMessage.addListener (function (msg) {
		if (null != msg.init) {
			var url = grepUrl (msg.url);
			var config = storageLoadConfig (url, (cfg) => {
				port.passhashUrl = url;
				ports[port.portId_] = port;
				port.postMessage ({ init: true, update: config });
			});
		} else if (null != msg.save) {
			var url = grepUrl (msg.url);
			saveConfig (url, msg.save);
		}
	});

	port.onDisconnect.addListener (function (port) {
		if (null != port.portId_) {
			delete ports[port.portId_];
		}
	});
});
