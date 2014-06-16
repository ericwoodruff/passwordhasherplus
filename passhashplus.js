var database; //this gets set only once, at [[database]]

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
		return this.indexOf(str) == 0;
	};
}

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


widenbutton.click (function() {
  if ("<->" == widenbutton.get(0).value) {
    hashfield.style["width"] = "26em";
    widenbutton.get(0).value= ">.<";
    widenbutton.get(0).title= "Narrow hash field"
  } else {
    hashfield.style["width"] = "1em";
    widenbutton.get(0).value= "<->";
    widenbutton.get(0).title = "Widen hash field"
  }
});


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


function selectionChanged () {
	var url = $("#urls option:selected").val ();
	var config = urls[url];
	tagfield.value = config.tag;
	seedfield.value = config.policy.seed;
	lengthfield.value = config.policy.length;
	strengthfield.value = config.policy.strength;
	update ();
}

function loadJsonData () {
	options=JSON.parse($('#json-internal-options').text ());
	$("script[id^=json-config]").each (function () {
		var url = $(this).attr("id").replace (/json-config-/, "");
		urls[url] = JSON.parse($(this).text ());
	});
}
  $('.nopasshash').on("keyup", update);         //x
  $('.nopasshash').on("change", update);          //y

var revealdatabase = $('#revealdatabase').get(0);
var database = $('#database').get(0);
$('#revealdatabase').click(function () {
  if (revealdatabase.value=="Reveal") {
    revealdatabase.value="Hide";
    revealdatabase.title="Hide Database";
    database.style['display'] = 'block';
  } else {
    revealdatabase.value="Reveal";
    revealdatabase.title="Reveal Database";
    database.style['display'] = 'none';
  }
});
