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
	options.hashKey = document.getElementById ("hashkey").value;
	options.maskKey = document.getElementById ("maskkey").value;
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
	document.getElementById ("hashkey").value = options.hashKey;
	document.getElementById ("maskkey").value = options.maskKey;
}



function refreshStorage() {
	document.getElementById ("everything").value = dumpDatabase();
        browser.storage.local.get(null)
            .then(results => {
                document.getElementById ("webext_storage").value = JSON.stringify(results, null, 2);
            });
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

function setShortcut(action, e) {
	if (e.which == 16 || e.which == 17)
		return;
	if (action == "hash")
		hk = document.getElementById('hashkey');
	if (action == "mask")
		hk = document.getElementById('maskkey');
	if (e.which != 0)
		hk.value = (e.ctrlKey ? "Ctrl+" : "") + (e.shiftKey ? "Shift+" : "") + e.which;
	else
		hk.value = (action == "hash" ? "Ctrl+Shift+51" : "Ctrl+Shift+56");
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

    $('#portablePage').click(function() {
	chrome.tabs.create({url:'/passhashplus.html'})
    });
	
	$('#hashkey').keydown(function(e) {setShortcut("hash", e)});
	$('#maskkey').keydown(function(e) {setShortcut("mask", e)});
	$('#haskeydefault').click(function() {var e = new Object(); e.which=0; setShortcut("hash", e)});
	$('#maskkeydefault').click(function(e) {var e = new Object(); e.which=0; setShortcut("mask", e)});

});
