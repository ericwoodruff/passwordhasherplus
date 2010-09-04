/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Password Hasher Plus
 *
 * The Initial Developer of the Original Code is Eric Woodruff.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): (none)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var config;

var port = chrome.extension.connect ({name: "passhash"});

var id = 0;

function bind (field) {
	var hasFocus = false;
	var backgroundStyle = field.style.backgroundColor;
	var input = field.value;
	var hash = "";
	var hashing = false;
	var masking = true;
	var editing = false;

	$(field).after (
		'<span class="hashbutton passhashbutton" title="Enable/disable Hashing">#</span>' +
		'<span class="maskbutton passhashbutton" title="Disable/enable Masking">a</span>');

	var hashbutton = $(field).next ("span.hashbutton").get (0);
	var maskbutton = $(field).nextAll ("span.maskbutton").get (0);

	if ("" == field.id) {
		// field has no id, so we will make one
		field.id = "passhash_" + id++;
	}

	function rehash () {
		var site = config.site;

		if (!site.startsWith ("compatible:")) {
			site = PassHashCommon.generateHashWord (
				config.seed,
				site,
				24,
				true, // require digits
				true, // require punctuation
				true, // require mixed case
				false, // no special characters
				false // only digits
			);
		} else {
			site = site.substringAfter (":");
		}

		hash = PassHashCommon.generateHashWord (
			site,
			input,
			config.length,
			true, // require digits
			config.strength > 1, // require punctuation
			true, // require mixed case
			config.strength < 2, // no special characters
			config.strength == 0 // only digits
		);
	}

	function painthash () {
		if ("" != input) {
			field.value = hash;
		} else {
			field.value = "";
		}
		field.style.backgroundColor = "#D1D1D1";
		editing = false;
	}

	function paintvalue () {
		field.value = input;
		field.style.backgroundColor = backgroundStyle;
		editing = true;
	}

	function painthashbutton () {
		if (hashing) {
			hashbutton.innerHTML = "\"";
			hashbutton.title = "Literal password (Ctrl + #)"
		} else {
			hashbutton.innerHTML = "#";
			hashbutton.title = "Hash password (Ctrl + #)"
		}
	}

	function setfieldtype () {
		if (masking) {
			field.type = "password";
			maskbutton.innerHTML = "a";
			maskbutton.title = "Show password (Ctrl + *)";
		} else {
			field.type = "text";
			maskbutton.innerHTML = "*";
			maskbutton.title = "Mask password (Ctrl + *)";
		}
	}

	function update () {
		input = field.value;
		rehash ();
	}

	function togglehashing (save) {
		hashing = !hashing;
		painthashbutton ();
		if (hashing) {
			config.fields[config.fields.length] = field.id;
			if (!hasFocus) {
				rehash ();
				painthash ();
			}
		} else {
			for (var i = 0; i < config.fields.length;) {
				if (config.fields[i] == field.id) {
					config.fields.splice (i, 1);
				} else {
					++i;
				}
			}
			if (!hasFocus) {
				paintvalue ();
			}
		}
		if (true == save) {
			port.postMessage ({save: config});
		}
	}

	function togglemasking () {
		masking = !masking;
		setfieldtype ();
	}

	function getselection () {
		var txt = null;
		if (window.getSelection) {
			txt = window.getSelection ();
		}
		else if (document.getSelection) {
			txt = document.getSelection ();
		} else if (document.selection) {
			txt = document.selection.createRange ().text;
		}
		if ("" == txt) {
			return null;
		}
		return txt;
	}

	function copy () {
		update ();
		painthash ();
		field.select ();
		document.execCommand ('Copy');
		paintvalue ();
	}

	painthashbutton ();
	setfieldtype ();

	/*field.addEventListener ("click", function () {
		if (!editing) {
			editing = true;
			paintvalue ();
		}
	});*/

	field.addEventListener ("focus", function () {
		if (hashing) {
			editing = true;
			paintvalue ();
		}
		hasFocus = true;
	});

	field.addEventListener ("blur", function () {
		update ();
		if (hashing) {
			painthash ();
		}
		hasFocus = false;
	});

	field.addEventListener ("change", update);

	hashbutton.addEventListener ("click", function () {
		togglehashing (true);
	});

	hashbutton.addEventListener ("rehash", function () {
		for (var i = 0; i < config.fields.length; ++i) {
			if (config.fields[i] == field.id) {
				if (!hashing) {
					// Hashing for this field was persisted but it is not enabled yet
					togglehashing (false);
					return;
				}
				break;
			}
		}
		if (hashing) {
			rehash ();
			painthash ();
		}
	});

	maskbutton.addEventListener ("click", togglemasking);

	var ctrlDown = false;
	var shiftDown = false;
	var altDown = false;
	$(field).keyup (function (e) {
		switch (e.which) {
			case 16: shiftDown = false; break;
			case 17: ctrlDown = false; break;
			case 18: altDown = false; break;
		};
	});

	var ctrl = 100000;
	var alt = 10000;
	var shift = 1000;

	$(field).keydown (function (e) {
		switch (e.which) {
			case 16: shiftDown = true; break;
			case 17: ctrlDown = true; break;
			case 18: altDown = true; break;
			default:
				// http://www.scottklarr.com/topic/126/how-to-create-ctrl-key-shortcuts-in-javascript/
				if (shiftDown) e.which += shift;
				if (altDown)   e.which += alt;
				if (ctrlDown)  e.which += ctrl;
				switch (e.which) {
					case ctrl + shift + 51: // ctrl + #
					case ctrl + 117: // ctrl + f6 
						togglehashing (true);
					break;
					case ctrl + shift + 56: // ctrl + *
						togglemasking ();
					break;
					case ctrl + 67: // ctrl + c
						if (null == getselection()) {
							copy ();
						}
					break;
					case 13:
						update ();
						if (hashing) {
							painthash ();
						}
					break;
				};
		};
	});
}

$("input[type=password]").each (function (index) {
	bind (this);
});

document.addEventListener ("DOMNodeInserted", onNodeInserted, false);

function onNodeInserted (evt) {
	$(evt.srcElement).find ("input[type=password]").each (function (index) {
		bind (this);
	});
}

var evt = document.createEvent ("HTMLEvents");
evt.initEvent ('rehash', true, true);
port.onMessage.addListener (function (msg) {
	console.debug (msg);
	if (null != msg.update) {
		config = msg.update;
		$("span.hashbutton").each (function (index) {
			this.dispatchEvent (evt);
		});
	}
});

port.postMessage ({init: location.href});
