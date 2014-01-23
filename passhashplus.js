
$(document).ready(function() {


if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
		return this.indexOf(str) == 0;
	};
}

if (typeof chrome != "undefined" && chrome.extension) {
	urls = {};
	options = chrome.extension.getBackgroundPage ().loadOptions ();
	
	for (var i = 0; i < localStorage.length; ++i) {
		var key = localStorage.key (i);
		if (key.startsWith ("url:")) {
			var url = key.slice (4);
			var config = chrome.extension.getBackgroundPage ().loadConfig (url);
			urls[url] = config;
		}
	}

	$.each (urls, function (key, value) {
		$("#urls").append ($("<option></option>").attr("value", key).text (value.tag));
	});

	function sortAlpha (a,b) {
		return a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase() ? 1 : -1;
	}

	$("#urls option").sort (sortAlpha).appendTo ("#urls");
}


$('#length').val (12);
$('#strength').val (2);

function toggleField () {
	var button = this;
	var field = $(this).prev ("input").get (0);
	if ("text" == field.type) {
		field.type = "password";
		button.value = "a";
		button.title = "Show contents (Ctrl + *)";
	} else {
		field.type = "text";
		button.value = "*";
		button.title = "Mask contents (Ctrl + *)";
	}
}

$('#unmaskseed').click (toggleField);
$('#unmasktag').click (toggleField);
$('#unmaskpassword').click (toggleField);

$('#bump').click (function () {
	$("#tag").val (bump ($("#tag").val ()));
	update ();
});

$('#save').click (function () {
	var html = $('html').clone();
	
	html.find('script').each(function() {
		var $this = $(this);
		var success = function(data) {
			$this.attr('src', "data:application/octet-stream," + encodeURIComponent(data));
		};
		$.ajax({'url':$this.attr('src'),'dataType':'text', 'success': success, async:false});
	});
	
	var template = html.find('head').append('<script type="text/javascript" id="template"></script>')
	
	$("#template", html).append ("options=JSON.parse(\"" + localStorage["options"].replace (/"/g, "\\\"") + "\");\n");
	$("#template", html).append ("urls=JSON.parse(\"" + JSON.stringify (urls).replace (/"/g, "\\\"") + "\");\n");
	
	var uriContent = "data:application/octet-stream," + encodeURIComponent(html.html());
	location.href=uriContent;
});

var selectfield = $('#urls').get (0);
var tagfield = $('#tag').get (0);
var seedfield = $('#seed').get (0);
var lengthfield = $('#length').get (0);
var strengthfield = $('#strength').get (0);
var inputfield = $('#input').get (0);
var hashfield = $('#hash').get (0);

hashfield.readOnly = true;

function update () {
	var config = new Object ();
	config.tag = tagfield.value;
	config.policy = new Object ();
	config.policy.seed = seedfield.value;
	config.policy.length = lengthfield.value;
	config.policy.strength = strengthfield.value;
	config.options = options;
	var input = inputfield.value;
	var hash = generateHash (config, input);
	hashfield.value = hash;
}

tagfield.addEventListener ("keydown", update);
seedfield.addEventListener ("keydown", update);
inputfield.addEventListener ("keydown", update);
tagfield.addEventListener ("keyup", update);
seedfield.addEventListener ("keyup", update);
inputfield.addEventListener ("keyup", update);
tagfield.addEventListener ("change", update);
seedfield.addEventListener ("change", update);
inputfield.addEventListener ("change", update);
lengthfield.addEventListener ("change", update);
strengthfield.addEventListener ("change", update);

hashfield.addEventListener ("click", function () {
	hashfield.select ();
});

function selectionChanged () {
	var url = $("#urls option:selected").val ();
	var config = urls[url];
	tagfield.value = config.tag;
	seedfield.value = config.policy.seed;
	lengthfield.value = config.policy.length;
	strengthfield.value = config.policy.strength;
	update ();
}

selectfield.addEventListener ("change", selectionChanged);

selectionChanged ();

});