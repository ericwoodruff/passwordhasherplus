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

var debug = false;

// XXX: Inject npm packages when running tests
if (typeof require !== 'undefined') {
    if (typeof tld === 'undefined') {
        var tld = require('lib/tld.min.js');
    }
    if (typeof crypto === 'undefined') {
        var crypto = new Object();
        crypto.getRandomValues = require('get-random-values');
    }
    if (typeof PassHashCommon === 'undefined') {
        PassHashCommon = require('lib/passhashcommon.js').PassHashCommon;
    }
}

String.prototype.startsWith = function (str) {
	return (this.match ("^" + str) == str);
}

String.prototype.substringAfter = function (str) {
	return (this.substring (this.indexOf (str) + str.length));
}

var Set = function () {}
Set.prototype.add = function (o) { this[o] = true; }
Set.prototype.remove = function (o) { delete this[o]; }

function toSet (array) {
	var s = new Set ();
	for (var i = 0; i < array.length; ++i) {
		s.add (array[i]);
	}
	return s;
}

function toArray (s) {
	return Object.keys (s);
}

var default_length = 8;
var default_strength = 2;
var default_hashkey = "Ctrl+Shift+51";
var default_maskkey = "Ctrl+Shift+56";
var default_sync = false;

function generateGuid () {
	var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
	var xycount = (template.match(/[xy]/g) || []).length;
	var rand = new Uint8Array(xycount);
	crypto.getRandomValues(rand);
	var i = 0;
	return template.replace (/[xy]/g, function(c) {
		var r = rand[i++] % 16, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString (16);
	}).toUpperCase ();
}

function generateHash (config, input) {
	var tag = config.tag;

	if (false == config.options.compatibilityMode && null != config.policy.seed) {
		tag = PassHashCommon.generateHashWord (
			config.policy.seed,
			tag,
			24,
			true, // require digits
			true, // require punctuation
			true, // require mixed case
			false, // no special characters
			false // only digits
		);
	}

	return PassHashCommon.generateHashWord (
		tag,
		input,
		config.policy.length,
		true, // require digits
		config.policy.strength > 1, // require punctuation
		true, // require mixed case
		config.policy.strength < 2, // no special characters
		config.policy.strength == 0 // only digits
	);
}

function bump (tag) {
	var re = new RegExp ("^([^:]+?)(:([0-9]+))?$");
	var compatible = false;
	if (tag.startsWith ("compatible:")) {
		tag = tag.substringAfter ("compatible:");
		compatible = true;
	}
	var matcher = re.exec (tag);
	var bump = 1;
	if (null != matcher[3]) {
		tag = matcher[1];
		bump += parseInt (matcher[3]);
	}
	if (compatible) {
		tag = "compatible:" + tag;
	}
	return tag + ":" + bump;
}

function dumpDatabase() {
    return browser.storage.local.get('sync').then(results => {
        var storagearea = browser.storage.local;
        if (results['sync']) {
            storagearea = browser.storage.sync;
        }
        return storagearea.get(null);
    });
}

/* grepUrl:
   take a url and return the corresponding site tag.

   (a) split the url into parts. Discard everything except the address.
       e.g. http://www.google.com:80/mail -> www.google.com

   (b) If the address looks like an ip address or dot free hostname, then
       return it. It can be used as the site tag.
       e.g. 192.168.1.1 -> 192.168.1.1
            localhost -> localhost

   (c) Any address which does not meet (b)'s criteria is probably a domain.
       Use the tldjs library (http://github.com/oncletom/tldjs) to:
         * Cut off the registrar controled part at the end of the domain
         * Cut off any subdomains off the beginning of the domain

       e.g. google.com -> google
            google.co.uk -> google
            mail.google.co.uk -> google
            calendar.google.co.uk -> google

       This is an important step because, (using google as an example):
       The passwords used at google.com, google.co.uk, google mail,
       and google calendar, all need to be the same.

   (d) If the URL is formatted in any other way, fall back to the default
       "chrome" site tag
*/

function grepUrl (url) {
    var split_at_first_dot = /(^[^.]+)\..*$/;
    var split_url = /^(https?:\/\/)(.+@)?([^:#\/]+)(:\d{2,5})?(\/.*)?$/;
    // 1 = protocol, 2 = auth, 3 = address, 4 = port, 5 = path
    // split_url is stolen from http://github.com/oncletom/tldjs
    var is_ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
    var is_dot_free_hostname = /^[^.]+$/;

    try {
        //if url badly formed, this will throw a type error, handled at (d)
        var address = split_url.exec(url)[3];                          // a
        if (is_ipv4.test(address) || is_dot_free_hostname.test(address)) {
            return address;                                            // b
        } else {
            //this shouldn't throw an error.
            //but just in case it does, handle it at (d)
            return split_at_first_dot.exec(tld.getDomain(address))[1]; // c
        }
    } catch (e) {
        return "chrome";                                               // d
    }
}

function extractQueryParam(string, key){
    key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
    var match = string.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

// http://stackoverflow.com/questions/7731778/jquery-get-query-string-parameters
function queryParam(key) {
    return extractQueryParam(location.search, key);
}

if (typeof exports !== 'undefined') {
    exports.bump = bump;
    exports.generateGuid = generateGuid;
    exports.grepUrl = grepUrl;
    exports.extractQueryParam = extractQueryParam;
    exports.generateHash = generateHash;
}
