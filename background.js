localStorage.migrate ();

var ports = {};

function refreshTabs () {
	var keys = toArray (ports);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		var port = ports[key];
		if (debug) console.log ("Loading " + port.passhashUrl + " for " + key);
		port.postMessage ({ update: loadConfig (port.passhashUrl) });
	}
}

function loadOptions () {
	return localStorage.loadOptions ();
}

function saveOptions (options) {
	localStorage.saveOptions (options);
	refreshTabs ();
}

function loadConfig (url) {
	return localStorage.loadConfig (url);
}

function loadTags () {
	return localStorage.loadTags ();
}

function saveConfig (url, config) {
	localStorage.saveConfig (url, config);
	refreshTabs ();
}

chrome.extension.onConnect.addListener (function (port) {
	console.assert (port.name == "passhash");
	port.onMessage.addListener (function (msg) {
		if (null != msg.init) {
			var url = grepUrl (msg.url);
			var config = localStorage.loadConfig (url);
			port.passhashUrl = url;
			ports[port.portId_] = port;
			port.postMessage ({ init: true, update: config });
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
