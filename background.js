// use ports as keys, payload mostly ignored
var ports = {};

function refreshTabs () {
	var keys = toArray (ports);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
                var port = ports[key];
                console.dir(port);
		if (debug) console.log ("Updating config for port " + key + " for " + port.passhashUrl);
		storage.loadConfig(port.passhashUrl, cfg => {
			port.postMessage ({ update: cfg });
		});
	}
}

chrome.runtime.onConnect.addListener (function (port) {
	console.assert (port.name == "passhash");
	port.onMessage.addListener (function (msg) {
		if (null != msg.init) {
			var url = grepUrl (msg.url);
			storage.loadConfig (url, (cfg) => {
                            console.dir(cfg);
                            console.dir(port);
                            if (debug) console.log("Registering port for url " + url);
                            port.passhashUrl = url;
                            ports[port] = port;
                            port.postMessage ({ init: true, update: cfg });
			});
		} else if (null != msg.save) {
			var url = grepUrl (msg.url);
			saveConfig (url, msg.save, null);
		}
	});

	port.onDisconnect.addListener (function (port) {
		if (null != port.passhashUrl) {
                    if (debug) console.log("deregistering port for url "+port.passhashUrl);
                    delete ports[port];
		}
	});
});
