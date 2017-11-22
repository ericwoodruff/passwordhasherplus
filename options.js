// TODO:
// notify user if they have local and sync settings that differ + offer to
// merge
var storage;

function setNewGuid () {
	var seedElement = document.getElementById ("seed");
	seedElement.value = generateGuid ();
}

function refreshOptionsPage(tag) {
    if (debug) console.log("[options.js] refreshOptionsPage called: " + tag);
    // make sure checkbox does not remain checked
    document.getElementById("sync-options").value = 0;
    restoreOptions();
    refreshStorage();
}

function saveSync() {
    var sync = document.getElementById("sync").value == 1;
    var syncopt = document.getElementById("sync-options").value;
    if (debug) console.log("[options.js:saveSync] sync=" + sync);
    if (debug) console.log("[options.js:saveSync] syncopt=" + syncopt);
    storage.migrateArea(sync, syncopt, () => { refreshOptionsPage('saveSync') });
}

// saveOptions does not update sync status, see saveSync().
function saveOptions () {
	var options = new Object ();
	options.defaultLength = document.getElementById ("length").value;
	options.defaultStrength = document.getElementById ("strength").value;
	console.log("defaultStrength = " + options.defaultStrength);
	if (options.defaultStrength == -1) {
		options.custom = new Object();
		options.custom.d = document.getElementById('d').checked;
		options.custom.p = document.getElementById('p').checked;
		options.custom.m = document.getElementById('m').checked;
		options.custom.r = document.getElementById('r').checked;
	} else {
		delete options.custom;
	}
	options.compatibilityMode = document.getElementById ("compatibility").checked;
	options.privateSeed = document.getElementById ("seed").value;
	options.backedUp = document.getElementById ("backedup").checked;
	options.hashKey = document.getElementById ("hashkey").value;
	options.maskKey = document.getElementById ("maskkey").value;
        if (debug) console.log('[options.js] Saving options='+JSON.stringify(options,null,2));
        storage.saveOptions(options, () => { refreshOptionsPage('saveOptions') });
}

function restoreOptions () {
    storage.loadOptions((options) => {
        document.getElementById ("length").value = options.defaultLength;
        document.getElementById ("strength").value = options.defaultStrength;
        document.getElementById ("compatibility").checked = options.compatibilityMode;
        document.getElementById ("seed").value = options.privateSeed;
        document.getElementById ("backedup").checked = options.backedUp;
        document.getElementById ("hashkey").value = options.hashKey;
        document.getElementById ("maskkey").value = options.maskKey;
	if (debug) console.log('setting sync value to '+ options.sync);
        document.getElementById ("sync").value = options.sync ? 1 : 0;
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
		select_storage_area().then(area => {
                    area.clear ();
                    alert ("Your database is now empty. " +
                            "You probably want to paste a previous snapshot of the database to the text area to the right, " +
                            "and hit \"Load\" to re-populate the database. " +
                            "Good luck.");
                });
	}
	storage.migrate ();
}

function loadStorage () {
	try {
		everything = JSON.parse(document.getElementById ("everything").value);
	} catch(e) {
		alert("Sorry, the data in the text area to the right is not valid JSON.");
		return;
	}
        // clear and rewrite storage area
        storage.init(everything).then(() => { refreshOptionsPage('load from db') });
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

function showHideCustomStrength() {
  var strength = $('#strength').val();
  if (strength == -1) {
    $('#customstrengthrow').removeClass("hidden");
  } else {
    $('#customstrengthrow').addClass("hidden");
  }
}
// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
    restoreOptions ();
    refreshStorage ();

    // make sure that when storage is changed, and options page is open, we
    // reflect the changed settings.
    browser.storage.onChanged.addListener(function(changes, area) {
        restoreOptions();
        refreshStorage();
    });

    $('#generate').click(setNewGuid);
    $('#backupSave').click(saveOptions);
    $('#backupRevert').click(restoreOptions);
    $('#removeUnUsedTags').click(function() {storage.collectGarbage (); refreshStorage ();});
    $('#dbClear').click(function() {clearStorage (); refreshStorage ();});
    $('#dbSave').click(loadStorage);
    $('#dbRevert').click(refreshStorage);
    $('#syncSave').click(saveSync);
    $('#strength').change(showHideCustomStrength);

    $('#portablePage').click(function() {
	chrome.tabs.create({url:'/passhashplus.html'})
    });
	
	$('#hashkey').keydown(function(e) {setShortcut("hash", e)});
	$('#maskkey').keydown(function(e) {setShortcut("mask", e)});
	$('#haskeydefault').click(function() {var e = new Object(); e.which=0; setShortcut("hash", e)});
	$('#maskkeydefault').click(function(e) {var e = new Object(); e.which=0; setShortcut("mask", e)});

});
