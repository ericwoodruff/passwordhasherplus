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

////////////////////////////////////////////////////////////////////////////////////
// [is-file-portable]                                                             //
// ------------------                                                             //
//                                                                                //
// There are two types of passhashplus.html file.                                 //
// A non-portable type and a portable type.                                       //
//                                                                                //
// The non-portable passhashplus.html is like a dumb needy girlfriend.            //
// ------------------------------------------------------------------             //
//                                                                                //
// * She's so dumb that she can't remember anything.                              //
//   Her <script id="database"> is completely empty. She has to ask the           //
//   chrome localStorage api whenever she wants to remember her private key,      //
//   the sites she visits, or the length and strength of her passwords.           //
//                                                                                //
// * She's so needy that she needs to share a directory with her boyfriend        //
//   passhashplus.js, and all her girlfriends (the *.js gang).                    //
//                                                                                //
// The portable passhashplus.html is like a nerdy guy with imaginary friends      //
// -------------------------------------------------------------------------      //
//                                                                                //
// * He's so nerdy that he memorized his entire private key. He keeps it in       //
//   his <script id="database"> along with the sites he visits, and the length    //
//   and strength of his passwords.                                               //
//                                                                                //
// * He's so imaginitive that he imagined his own girlfriend, passhashplus.js     //
//   and he keeps her directly in <script> tags. He doesn't like to               //
//   use a <script src=...> like the other kids do. He's also imaginary friends   //
//   with the *.js gang, all kept directly in their <script> tags.                //
//   Sadly, his close friend passhashplus-data.js was recently lost during a      //
//   drive-by shooting organised by the *.coffee crew.                            //
//   To summarise: He's so imaginative that he doesn't need to share a directory  //
//   with anyone.                                                                 //
//                                                                                //
// p.s.                                                                           //
// If you press download on the non-portable html page, you get the portable      //
// html page                                                                      //
////////////////////////////////////////////////////////////////////////////////////

  if (JSON.parse( $('#is-file-portable').text() )){

     //////////////////////////////////////////////
     // File is portable:                        //
     //                                          //
     //   * Scripts are already inlined          //
     //   * Database already populated           //
     //   * Download button already invisible... //
     //                                          //
     // Nothing to do.                           //
     //////////////////////////////////////////////
     invariant_startup_code();
  } else {

     /////////////////////////////////////////////////////////////////////////////
     // File is not portable:                                                   //
     //                                                                         //
     // 1. Inline all javascript scripts                                        //
     //   1.a. Grab the contents of wherever src= points to.                    //
     //   1.b. Put those contents in between <script> tags                      //
     //   1.c. Remove the old "src=" attribute                                  //
     //   1.d. Leave a comment to say what the old "src=" attribute was         //
     //                                                                         //
     // 2. Populate the <script id="database">                                  //
     //                                                                         //
     // 3.When the ajax from //1 is all finished: Set up the Download button    //
     //   3.a. Encode the entire DOM as a URI, and set it to the href of the    //
     //        download button                                                  //
     //   3.b. Make the download button visible.                                //
     //        Note that the download button is made visible _after_ the DOM -> //
     //        URI encoding. Therefore, it will be invisible in the downloaded  //
     //        file                                                             //
     /////////////////////////////////////////////////////////////////////////////


    $('#is-file-portable').text("true");
    var gettings = $("script").map(function(_i, script){ //1
      if (script.type == "text/javascript"){
        return $.get($(script).attr('src'), function (data) { //1.a
          $(script).text (data); //1.b
          $(script).before('<!-- src="' + $(script).attr('src') + '" -->'); //1.d
          $(script).removeAttr("src"); //1.c
        });
      } //if (script.type == "text/javascript")
    });

    $('#database').text(dumpDatabase()); //2

    $.when.apply(null, gettings).done(function(){ //3
      var uriContent = "data:application/octet-stream,"
                       + encodeURIComponent($('html').html());
      $('#save').attr('href', uriContent); //3.a
      $('#savediv').css('display','block'); //3.b
      invariant_startup_code();
    });
  }
}); //end of $(document).ready()


function invariant_startup_code(){
  //invariant_startup_code can be entered from two places,
  //immediately at startup for
  //////////////////////////////////////////////////////////////////////////
  // This code is run regardless of wheather the file is portable or not. //
  //                                                                      //
  // 4. Parse the database, and put it in a global for everyone to use    //
  //                                                                      //
  // 5. Populate drop down list from database                             //
  //   5.b. for each site tag in the database                             //
  //      5.b.i add it as an option to the drop down list                 //
  //                                                                      //
  // 6. Populate database textarea from database                          //
  //                                                                      //
  // 7. Pretend the drop down list just got changed, so that the text     //
  //    fields get populated                                              //
  //                                                                      //
  //////////////////////////////////////////////////////////////////////////


  //4 set global variable [[database]]
  database=JSON.parse($('#database').text ()); //4.a.

  //5
  var regexp = /tag:(.+)/;
  for (var key in database) {
    if (key.match(regexp)){ //5.b.
      var sitetag = regexp.exec(key)[1];
      $('#urls').append ($("<option></option>").text(sitetag)); //5.b.i
    }
  }

  $('#databasetextarea').text($('#database').text()); //6

  $('.nopasshash').on("keyup", update);     //x
  $('.nopasshash').on("change", update);    //y
  $('#urls').on("change", selectionChanged);//z

  //x,y,z are here to make sure database is defined before
  //update/selectionChaned can fire

  selectionChanged(); //7
}
