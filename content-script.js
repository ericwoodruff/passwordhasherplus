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
	if ("" == field.id) {
		field.id = "passhash_" + id++;
	}

	var marker = $(field).next ("div.passhashfield").get (0);
	if (null != marker || $(field).hasClass ("nopasshash")) {
		return;
	}
	$(field).after ('<div class="passhashfield"/>');

	var hasFocus = false;
	var backgroundStyle = field.style.backgroundColor;
	var input = field.value;
	var hash = "";
	var hashing = false;
	var masking = true;
	var editing = false;

	var content = '<span id="hash_' + field.id + '" class="passhashbutton"/>' +
		'<span id="mask_' + field.id + '" class="passhashbutton"/>';

	var hashbutton;
	var maskbutton;

	$(field).qtip ({
		id: "tip_" + field.id,
		content: {
			text: content
		},
		position: { my: 'top right', at: 'bottom right' },
		style: { padding: '5px 10px', },
		show: {
			event: 'focus mouseenter',
			solo: true
		},
		hide: {
			fixed: true,
			event: 'unfocus'
		},
		style: {
			classes: 'ui-tooltip-light'
		},
		events: {
			visible: function (event, api) {
				if (null != hashbutton) {
					return;
				}

				hashbutton = $("#hash_" + field.id, api.elements.content).get (0);
				maskbutton = $("#mask_" + field.id, api.elements.content).get (0);


				hashbutton.addEventListener ("click", function () {
					toggleHashing (true);
				});

				maskbutton.addEventListener ("click", togglemasking);
				paintHashButton ();
				setFieldType ();
			}
		}
	});

	function rehash () {
		hash = generateHash (config, input);
	}

	function paintHash () {
		if ("" != input) {
			field.value = hash;
		} else {
			field.value = "";
		}
		field.style.backgroundColor = "#D1D1D1";
		editing = false;
	}

	function paintValue () {
		field.value = input;
		field.style.backgroundColor = backgroundStyle;
		editing = true;
	}

	function paintHashButton () {
		if (null == hashbutton) {
			return;
		}
		if (hashing) {
			hashbutton.innerHTML = "\"";
			hashbutton.title = "Literal password (Ctrl + #)"
		} else {
			hashbutton.innerHTML = "#";
			hashbutton.title = "Hash password (Ctrl + #)"
		}
	}

	function setFieldType () {
		if (masking) {
			field.type = "password";
			if (null != maskbutton) {
				maskbutton.innerHTML = "a";
				maskbutton.title = "Show password (Ctrl + *)";
			}
		} else {
			field.type = "text";
			if (null != maskbutton) {
				maskbutton.innerHTML = "*";
				maskbutton.title = "Mask password (Ctrl + *)";
			}
		}
	}

	function update () {
		input = field.value;
		rehash ();
	}

	function toggleHashing (save) {
		hashing = !hashing;
		paintHashButton ();
		if (hashing) {
			config.fields[config.fields.length] = field.id;
			if (!hasFocus) {
				rehash ();
				paintHash ();
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
				paintValue ();
			}
		}
		if (true == save) {
			port.postMessage ({url: location.href, save: config});
		}
	}

	function togglemasking () {
		masking = !masking;
		setFieldType ();
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
		paintHash ();
		field.select ();
	}

	field.addEventListener ("focus", function () {
		if (hashing) {
			editing = true;
			paintValue ();
		}
		hasFocus = true;
	});

	field.addEventListener ("blur", function () {
		if (editing) {
			update ();
		}
		if (hashing) {
			paintHash ();
		}
		hasFocus = false;
	});

	field.addEventListener ("change", update);

	field.addEventListener ("rehash", function () {
		for (var i = 0; i < config.fields.length; ++i) {
			if (config.fields[i] == field.id) {
				if (!hashing) {
					// Hashing for this field was persisted but it is not enabled yet
					toggleHashing (false);
					return;
				}
				break;
			}
		}
		if (hashing) {
			rehash ();
			paintHash ();
		}
	});

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
						toggleHashing (true);
					break;
					case ctrl + shift + 56: // ctrl + *
						togglemasking ();
					break;
					case ctrl + 67: // ctrl + c
						if (null == getselection () && !masking) {
							copy ();
						}
					break;
					case 13:
						update ();
						if (hashing) {
							paintHash ();
						}
						$(field).qtip ("hide");
					break;
				};
		};
	});

	setFieldType ();
}

$("input[type=password]").each (function (index) {
	bind (this);
});

document.addEventListener ("DOMNodeInserted", onNodeInserted, false);
document.addEventListener ("DOMNodeInsertedIntoDocument", onNodeInserted, false);
document.addEventListener ("DOMSubtreeModified", onNodeInserted, false);

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
		$("input[type=password]").each (function (index) {
			this.dispatchEvent (evt);
		});
	}
});

port.postMessage ({init: true, url:location.href});
