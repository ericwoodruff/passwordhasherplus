options = chrome.extension.getBackgroundPage ().loadOptions ();

var total = $("script[src!='passhashplus-data.js']").size ();
var current = 0;
$("script[src!='passhashplus-data.js']").each(function () {
	var script = this;
	$.get ($(this).attr('src'), function (data) {
		$(script).text (data);
		$(script).removeAttr("src");
		++current;
		if (current == total) {
			var uriContent = "data:application/octet-stream," + encodeURIComponent($('html').html());
			$('#save').attr('href', uriContent);
			$('#savediv').get(0).style['display']='block';
		}
	});
});
$("#data-script").removeAttr("src");

$("#json-data").append ('<script type="application/json" id="json-internal-options"></script>\n');
$("#json-internal-options").text (localStorage["options"]);

for (var i = 0; i < localStorage.length; ++i) {
	var key = localStorage.key (i);
	if (key.startsWith ("url:")) {
		var url = key.slice (4);
		var config = chrome.extension.getBackgroundPage ().loadConfig (url);
		urls[url] = config;
		var id = "json-config-" + url;
		$("#json-data").append ('<script type="application/json" id="'+ id +'"></script>\n');
		$("#"+id.replace (/\./g, "\\.")).text (JSON.stringify (config));
	}
}

$("#data-script").append ("loadJsonData ();\n");

$.each (urls, function (key, value) {
	$("#urls").append ($("<option></option>").attr("value", key).text (value.tag));
});

function sortAlpha (a,b) {
	return a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase() ? 1 : -1;
}

$("#urls option").sort (sortAlpha).appendTo ("#urls");

selectionChanged ();
$("#data-script").append ("selectionChanged ();\n");
