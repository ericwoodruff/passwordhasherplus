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
	chrome.extension.getBackgroundPage ().saveConfig (url, config);
}
window.onunload = writeModel;

function readModel () {
	$('#tag').val (config.tag);
	$('#tag').autocomplete ({ source: chrome.extension.getBackgroundPage ().loadTags () });
	$('#length').val (config.policy.length);
	$('#strength').val (config.policy.strength);
	if (true == config.options.compatibilityMode) {
		$('div#compatmodeheader').html ("<b>Compatibility:</b>");
		$('div#compatmode').text ("on");
	} else if (null == config.policy.seed) {
		$('#tag').val ("compatible:" + config.tag);
	}
	if (false == config.options.backedUp && false == config.options.compatibilityMode) {
		$('div#compatmodeheader').html ("<b>Warning:</b>");
		$('div#compatmode').text ("You have not yet indicated that you have backed up your private key. Please do so on the Options page.");
	}
}

chrome.tabs.getSelected (null, function (tab) {
	url = chrome.extension.getBackgroundPage ().grepUrl (tab.url);
	config = chrome.extension.getBackgroundPage ().loadConfig (url);
	config.fields = toSet (config.fields);
	readModel ();
});

$('#bump').click (function () {
	$("#tag").val (bump ($("#tag").val ()));
	writeModel ();
});

$('#tag').change (writeModel);
$('#length').change (writeModel);
$('#strength').change (writeModel);

$(document).ready(function() {
    $('#link-options').click(function() {
        chrome.tabs.create({url:'chrome-extension://'+location.hostname+'/options.html'})
    });
})
