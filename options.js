function setNewGuid () {
	var seedElement = document.getElementById ("seed");
	seedElement.value = generateGuid ();
}

function saveOptions () {
	var options = new Object ();
	options.defaultLength = document.getElementById ("length").value;
	options.defaultStrength = document.getElementById ("strength").value;
	options.compatibilityMode = document.getElementById ("compatibility").checked;
	options.privateSeed = document.getElementById ("seed").value;
	options.backedUp = document.getElementById ("backedup").checked;
	chrome.extension.getBackgroundPage ().saveOptions (options);
	refreshStorage ();
}

function restoreOptions () {
	var options = localStorage.loadOptions ();
	document.getElementById ("length").value = options.defaultLength;
	document.getElementById ("strength").value = options.defaultStrength;
	document.getElementById ("compatibility").checked = options.compatibilityMode;
	document.getElementById ("seed").value = options.privateSeed;
	document.getElementById ("backedup").checked = options.backedUp;
}

function refreshStorage () {
	var entries = [];
	var keys = toArray (localStorage);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var value = localStorage.getItem(key);
		var entry = {}
		if (key.slice(0, 7) == "option:") {
			entry[key] = value;
		} else {
			try {
				entry[key] = JSON.parse(value);
			} catch (e) {
				entry[key] = "BAD: " + value
			}
		}
		entry = JSON.stringify(entry);
		entry = entry.replace("{","").replace(/}$/,"");
		entries.push(entry);
	}
	entries.sort ();
	document.getElementById ("everything").value = "{\n" + entries.join(",\n") + "\n}\n";
}

function clearStorage () {
	if (confirm ("You are about to erase all of the Password Hasher Plus database. " +
		    "This is typically done before loading a snapshot of a previous database state. " +
		    "Are you certain you want to erase the database?")) {
		localStorage.clear ();
		alert ("Your database is now empty. " +
		      "You probably want to paste a previous snapshot of the database to the text area to the right, " +
		      "and hit \"Load\" to re-populate the database. " +
		      "Good luck.");
	}
	localStorage.migrate ();
}

function loadStorage () {
	try {
		everything = JSON.parse(document.getElementById ("everything").value);
	} catch(e) {
		alert("Sorry, the data in the text area to the right is not valid JSON.");
		return;
	}
	localStorage.clear ();
	for (var key in everything) {
		var value = everything[key];
		if (key.slice(0, 7) != "option:") value = JSON.stringify(value);
		localStorage.setItem (key, value);
	}
	localStorage.migrate ();
	restoreOptions ();
	refreshStorage ();
}

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
    restoreOptions ();
    refreshStorage ();

    $('#generate').click(setNewGuid);
    $('#backupSave').click(saveOptions);
    $('#backupRevert').click(restoreOptions);
    $('#removeUnUsedTags').click(function() {localStorage.collectGarbage (); refreshStorage ();});
    $('#dbClear').click(function() {clearStorage (); refreshStorage ();});
    $('#dbSave').click(loadStorage);
    $('#dbRevert').click(refreshStorage);

    $('#portablePage').click(function() {chrome.tabs.create({url:'chrome-extension://'+location.hostname+'/passhashplus.html'})});

});
