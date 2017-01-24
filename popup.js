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
	if(null == config.policy.seed || config.policy.seed == config.options.privateSeed) {
		$("#syncneeded").addClass("hidden");
	}
}

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
	if(null != config.policy.seed && config.policy.seed != config.options.privateSeed) {
		$("#syncneeded").removeClass("hidden");
	}
}

function callOnCurrentTab(f) {
  if (typeof chrome.tabs.query === 'function') {
    chrome.tabs.query({active: true, currentWindow: true},
        (tabs) => { f(tabs[0]) });
  } else if (typeof browser.tabs.query === 'function') {
    browser.tabs.query({active: true, currentWindow: true})
      .then((tabs) => { f(tabs[0]) });
  } else {
    console.log("Not Chrome or Firefox, don't know how to get current tab");
  }
}

callOnCurrentTab(function (tab) {
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
        // Need chrome.runtime here to not break Chrome
        chrome.runtime.openOptionsPage();
    });
    $('#portablePage').click(function() {
        // For compatibility with Firefox just do /page.html for URL
        chrome.tabs.create({url:'/passhashplus.html?tag=' + $('#tag').val()})
    });
})
