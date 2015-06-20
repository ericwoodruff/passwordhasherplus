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

var fields = new Array ();

function bind (f) {
	var field = f;
	if ("" == field.id) {
		field.id = "passhash_" + id++;
	}

	if (-1 != $.inArray(field, fields) || $(field).hasClass ("nopasshash")) {
		return false;
	}
	fields[fields.length] = field;

	var hasFocus = false;
	var backgroundStyle = field.style.backgroundColor;
	var input = field.value;
	var hash = "";
	var hashing = false;
	var masking = true;
	var editing = false;

	var content = '<span class="passhashbutton hashbutton"/><span class="passhashbutton maskbutton"/>';

	var hashbutton;
	var maskbutton;

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

	function toggleMasking () {
		masking = !masking;
		setFieldType ();
	}

	function getSelection () {
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

	function focusEvent () {
		if (hashing) {
			editing = true;
			paintValue ();
		}
		hasFocus = true;
	}

	function blurEvent () {
		if (editing) {
			update ();
		}
		if (hashing) {
			paintHash ();
		}
		hasFocus = false;
	}

	function rehashEvent () {
		rehash ();
		if (hashing) {
			paintHash ();
		}
	}

	function addFieldEventListeners () {
		field.addEventListener ("focus", focusEvent);
		field.addEventListener ("blur", blurEvent);
		field.addEventListener ("change", update);
		field.addEventListener ("rehash", rehashEvent);
	}

	function removeFieldEventListeners () {
		field.removeEventListener ("focus", focusEvent);
		field.removeEventListener ("blur", blurEvent);
		field.removeEventListener ("change", update);
		field.removeEventListener ("rehash", rehashEvent);
	}

	field.addEventListener ("sethash", function () {
		toggleHashing (false);
	});

	function toggleHashing (save) {
		hashing = !hashing;
		if (hashing) {
			update ();
		}
		if (null != hashbutton) {
			paintHashButton ();
		}
		if (hashing) {
			config.fields.add (field.id);
			if (!hasFocus) {
				rehash ();
				paintHash ();
			}
			addFieldEventListeners ();
		} else {
			removeFieldEventListeners ();
			config.fields.remove (field.id);
			if (!hasFocus) {
				paintValue ();
			}
		}
		if (true == save) {
			port.postMessage ({url: location.href, save: config});
		}
	}

	$(field).qtip ({
		content: {
			text: content
		},
		position: { my: 'top right', at: 'bottom right' },
		show: {
			event: 'focus mouseenter',
			solo: true
		},
		hide: {
			fixed: true,
			event: 'unfocus'
		},
		style: {
			classes: 'ui-tooltip-light ui-tooltip-rounded'
		},
		events: {
			visible: function (event, api) {
				if (null != hashbutton) {
					return;
				}

				hashbutton = $(".hashbutton", api.elements.content).get (0);
				maskbutton = $(".maskbutton", api.elements.content).get (0);

				hashbutton.addEventListener ("click", function () {
					toggleHashing (true);
				});

				maskbutton.addEventListener ("click", toggleMasking);
				paintHashButton ();
				setFieldType ();
			}
		}
	});

	$(field).keydown (function (e) {
		shortcut = (e.ctrlKey ? "Ctrl+" : "") + (e.shiftKey ? "Shift+" : "") + e.which;
		if (shortcut == config.options.hashKey)
			toggleHashing (true);
		if (shortcut == config.options.maskKey)
			toggleMasking ();
		if (shortcut == "Ctrl+67" && null == getSelection () && !masking) // ctrl + c
			copy ();
		if (e.which == 13) {
			update ();
			if (hashing) {
				paintHash ();
			}
			$(field).qtip ("hide");
		}
	});

	setFieldType ();
	return true;
}

$("input[type=password]").each (function (index) {
	bind (this);
});

var setHashEvt = document.createEvent ("HTMLEvents");
setHashEvt.initEvent ('sethash', true, true);

var rehashEvt = document.createEvent ("HTMLEvents");
rehashEvt.initEvent ('rehash', true, true);

function onMutation (mutations, observer) {
	mutations.forEach (function(mutation) {
		for (var i = 0; i < mutation.addedNodes.length; ++i) {
			var item = mutation.addedNodes[i];
			if (item.nodeName == 'INPUT' && item.type == 'password') {
				bind(item);
			} else {
				$("input[type=password]", item).each(function (i) {
					bind(this);
				})
			}
		}
	});
}


port.onMessage.addListener (function (msg) {
	if (null != msg.update) {
		if (debug) console.log ("Config updated " + JSON.stringify (msg.update));
		config = msg.update;
		config.fields = toSet (config.fields);
		for (var i = 0; i < fields.length; ++i) {
			fields[i].dispatchEvent (rehashEvt);
		}
	}
	if (null != msg.init) {
		for (var i = 0; i < fields.length; ++i) {
			if (fields[i].id in config.fields) {
				// Hashing for this field was persisted but it is not enabled yet
				fields[i].dispatchEvent (setHashEvt);
			}
		}
		var observer = new MutationObserver (onMutation);
		observer.observe (document, { childList: true, subtree: true });
	}
});

port.postMessage ({init: true, url:location.href});
