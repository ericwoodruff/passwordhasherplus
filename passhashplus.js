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

function selectionChanged () {
  var tag = $("#urls option:selected").text ();
  $('#tag').val(tag);
  $('#seed').val(database['tag:' + tag].seed);
  $('#length').val(database['tag:' + tag].length);
  $('#strength').val(database['tag:' + tag].strength);
  update ();
}

function update () {
  var config = new Object ();
  config.tag = $('#tag').val();
  config.policy = new Object ();
  config.policy.seed = $('#seed').val();
  config.policy.length = $('#length').val();
  config.policy.strength = $('#strength').val();
  config.options = database.options;
  $('#hash').val
    (generateHash
      (config,$('#input').val())
    );
}

$( document ).ready(function () {

  $('#unmaskseed').click (toggleField);
  $('#unmasktag').click (toggleField);
  $('#unmaskpassword').click (toggleField);

  $('#bump').click (function () {
          $("#tag").val (bump ($("#tag").val ()));
          update ();
  });

  $('#widenhash').click (function() {
    if ("<->" == $('#widenhash').val()) {
      $('#hash').css("width", "26em");
      $('#widenhash').val(">.<");
      $('#widenhash').attr("title", "Narrow hash field");
    } else {
      $('#hash').css("width", "1em");
      $('#widenhash').val("<->");
      $('#widenhash').attr("title", "Widen hash field");
    }
  });

  $('#hash').click(function () {
    $('#hash').select();
  });

  $('#revealdatabase').click(function () {
    if ($('#revealdatabase').val()=="Reveal") {
      $('#revealdatabase').val("Hide");
      $('#revealdatabase').attr("title","Hide Database");
      $('#databasetextarea').css('display','block');
    } else {
      $('#revealdatabase').val("Reveal");
      $('#revealdatabase').attr("title","Reveal Database");
      $('#databasetextarea').css('display','none');
    }
  });
}); //end of $(document).ready()

function loadJsonData () {
	options=JSON.parse($('#json-internal-options').text ());
	$("script[id^=json-config]").each (function () {
		var url = $(this).attr("id").replace (/json-config-/, "");
		urls[url] = JSON.parse($(this).text ());
	});
}
  $('.nopasshash').on("keyup", update);         //x
  $('.nopasshash').on("change", update);          //y
