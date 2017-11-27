var storage;
var url;
var config;

function writeModel () {
	config.tag = $('#tag').val ();
	if (config.tag.startsWith ("compatible:")) {
		config.tag = config.tag.substringAfter ("compatible:");
		delete config.policy.seed;
	} else {
		config.policy.seed = config.options.privateSeed;
	}
	config.policy.length = $('#length').val ();
	config.policy.strength = $('#strength').val ();
        if (config.policy.strength == -1) {
            config.policy.custom = new Object();
            config.policy.custom.d = $('#d').prop('checked');
            config.policy.custom.p = $('#p').prop('checked');
            config.policy.custom.m = $('#m').prop('checked');
            config.policy.custom.r = $('#r').prop('checked');
        } else {
            delete config.policy.custom;
        }
	if(null == config.policy.seed || config.policy.seed == config.options.privateSeed) {
		$("#syncneeded").addClass("hidden");
	}
        if (debug) console.log("[popup.js] saving config");
        storage.saveConfig(url, config, function() {
            if (debug) console.log("[popup.js:writeModel] refreshing tabs");
            chrome.extension.getBackgroundPage ().refreshTabs();
            if (debug) console.log("[popup.js:writeModel] refreshing popup");
            refreshPopup();
        });
}

function readModel () {
    console.log("readModel()");
    storage.loadTags(tags => {
	$('#tag').val (config.tag);
	$('#tag').autocomplete ({ source: tags });
	$('#length').val (config.policy.length);
	$('#strength').val (config.policy.strength);
	if (true == config.options.compatibilityMode) {
		$('div#compatmodeheader').html ("<b>Compatibility:</b> on");
	} else if (null == config.policy.seed) {
		$('#tag').val ("compatible:" + config.tag);
	}
	if (false == config.options.backedUp && false == config.options.compatibilityMode) {
		$('div#compatmodeheader').html ("<b>Warning:</b>");
		$('div#compatmode').text ("You have not yet indicated that you have backed up your private key. Please do so on the Options page.");
	}
	if(null != config.policy.seed && config.policy.seed != config.options.privateSeed) {
		$("#syncneeded").removeClass("hidden");
	}
	if (config.policy.strength == -1) {
		console.log("custom strength: show checkboxes");
		$('#strength-requirements').removeClass('hidden');
		$('#strength-restrictions').removeClass('hidden');
                if (config.policy.custom === undefined) {
                    config.policy.custom = config.options.custom;
                }
                $('#d').prop('checked', config.policy.custom.d);
                $('#p').prop('checked', config.policy.custom.p);
                $('#m').prop('checked', config.policy.custom.m);
                $('#r').prop('checked', config.policy.custom.r);
	} else {
		console.log("not custom strength: hide checkboxes");
		$('#strength-requirements').addClass('hidden');
		$('#strength-restrictions').addClass('hidden');
	}
    });
}

function refreshPopup() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        url = chrome.extension.getBackgroundPage ().grepUrl (tabs[0].url);
        if (debug) console.log('loading/creating config for url='+url);
        storage.loadConfig(url, (cfg) => {
            if (debug) console.log('got config='+JSON.stringify(cfg, null, 2));
            config = cfg;
            config.fields = toSet (config.fields);
            readModel ();
        });
    });
}

$('#bump').click (function () {
	$("#tag").val (bump ($("#tag").val ()));
	writeModel ();
});

$('#tag').change (writeModel);
$('#length').change (writeModel);
$('#strength').change (writeModel)
$('#d').change(writeModel);
$('#p').change(writeModel);
$('#m').change(writeModel);
$('#r').change(writeModel);

$(document).ready(function() {
    // populate popup fields
    refreshPopup();

    $('#link-options').click(function() {
        chrome.runtime.openOptionsPage();
    });
    $('#portablePage').click(function() {
        // For compatibility with Firefox just do /page.html for URL
        chrome.tabs.create({url:'/passhashplus.html?tag=' + $('#tag').val()})
    });
})
