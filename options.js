
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
        options.sync = document.getElementById ("sync").checked;
        if (debug) console.log('[options.js] Saving options='+JSON.stringify(options,null,2));
        storageSaveOptions(options);
        // make sure we respect 'sync' flag and clear old storage area after
        storageMigrateArea(options.sync, () => { refreshStorage(); });
}

function restoreOptions () {
    storagearea.get('options').then(
        results => {
            options = results.options;
            document.getElementById ("length").value = options.defaultLength;
            document.getElementById ("strength").value = options.defaultStrength;
            document.getElementById ("compatibility").checked = options.compatibilityMode;
            document.getElementById ("seed").value = options.privateSeed;
            document.getElementById ("backedup").checked = options.backedUp;
            document.getElementById ("hashkey").value = options.hashKey;
            document.getElementById ("maskkey").value = options.maskKey;
        });
}



function refreshStorage() {
	dumpDatabase().then(db => {
		document.getElementById ("everything").value = JSON.stringify(db, null, 2);
	});
}

function clearStorage () {
	if (confirm ("You are about to erase all of the Password Hasher Plus database. " +
		    "This is typically done before loading a snapshot of a previous database state. " +
		    "Are you certain you want to erase the database?")) {
		storagearea.clear ();
		alert ("Your database is now empty. " +
		      "You probably want to paste a previous snapshot of the database to the text area to the right, " +
		      "and hit \"Load\" to re-populate the database. " +
		      "Good luck.");
	}
	storageMigrate ();
}

function loadStorage () {
	try {
		everything = JSON.parse(document.getElementById ("everything").value);
	} catch(e) {
		alert("Sorry, the data in the text area to the right is not valid JSON.");
		return;
	}
        // clear old storage area
        storagearea.clear();
        storageInit(everything)
            .then(() => {
                restoreOptions ();
                refreshStorage ();
            });
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
    $('#removeUnUsedTags').click(function() {storageCollectGarbage (); refreshStorage ();});
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
