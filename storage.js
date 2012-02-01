<!--
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
 * Contributor(s): Oren Ben-Kiki
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
-->

Storage.prototype.setObject = function (key, value) {
	var str = JSON.stringify (value);
	if (debug) console.log ("Set " + key + " " + str);
	this.setItem (key, str);
}

Storage.prototype.getObject = function (key) {
	var str = this.getItem (key);
	if (null == str) {
		if (debug) console.log ("Get " + key + " null");
		return null;
	}
	if (debug) console.log ("Get " + key + " " + str);
	return JSON.parse (str);
}

Storage.prototype.getBoolean = function (key) {
	if ("true" == localStorage[key]) {
		return true;
	}
	return false;
}

Storage.prototype.saveOptions = function (options) {
	localStorage.setObject ("options", options);
}

Storage.prototype.loadOptions = function () {
	var dirty = false;
	var options;
	options = localStorage.getObject ("options");
	if (null == options) {
		options = new Object ();
		dirty = true;
	}
	if (null == options.privateSeed) {
		options.privateSeed = generateGuid ();
		dirty = true;
	}
	if (null == options.defaultLength) {
		options.defaultLength = default_length;
		dirty = true;
	}
	if (null == options.defaultStrength) {
		options.defaultStrength = default_strength;
		dirty = true;
	}
	if (null == options.backedUp) {
		options.backedUp = false;
		dirty = true;
	}
	if (null == options.compatibilityMode) {
		options.compatibilityMode = false;
		dirty = true;
	}
	if (dirty) {
		this.saveOptions (options);
	}
	return options;
}

Storage.prototype.saveConfig = function (url, config) {
	if (debug) console.log ("Saving " + url + " " + JSON.stringify (config));
	config.fields = toArray (config.fields);

	localStorage.setObject ("tag:" + config.tag, config.policy);

	var options = config.options;
	var policy = config.policy;
	delete config.policy;
	delete config.options;

	localStorage.setObject ("url:" + url, config);
	config.policy = policy;
	config.options = options;
}

Storage.prototype.isTagReferenced = function (keys, tag) {
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (key.startsWith ("url:")) {
			var config = localStorage.getObject (key);
			if (config.tag == tag) {
				return true;
			}
		}
	}
	return false;
}

Storage.prototype.collectGarbage = function () {
	// remove unreferenced tags
	var keys = toArray (localStorage);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (key.startsWith ("tag:")) {
			if (!isTagReferenced (keys, key.substringAfter ("tag:"))) {
				delete localStorage[key];
			}
		}
	}
}

Storage.prototype.loadConfig = function (url) {
	var config = localStorage.getObject ("url:" + url);
	if (null == config) {
		config = new Object ();
		config.tag = url;
		config.fields = new Array ();
	}

	config.options = this.loadOptions ();
	config.policy = localStorage.getObject ("tag:" + config.tag);

	if (null == config.policy) {
		config.policy = new Object ();
		config.policy.seed = config.options.privateSeed;
		config.policy.length = config.options.defaultLength;
		config.policy.strength = config.options.defaultStrength;
	}

	return config;
}

Storage.prototype.migrate = function () {
	if (null == localStorage["version"]) {
		if (null != localStorage["option:private_seed"]) {
			// Migrate Password Hasher Plus Plus databases
			localStorage["version"] = "1";
		} else {
			localStorage["version"] = "0";
			this.runMigration (1, this.migrate_v1);
		}
	}
	this.runMigration (2, this.migrate_v2);
	this.runMigration (3, this.migrate_v3);
	this.runMigration (4, this.migrate_v4);
	this.runMigration (5, this.migrate_v5);
}

Storage.prototype.migrate_v5 = function () {
	var keys = toArray (localStorage);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (key.startsWith ("url:")) {
			var config = localStorage.getObject (key);
			var tagName = config.tag;
			var tag = new Object ();
			tag.strength = config.strength;
			tag.length = config.length;
			tag.seed = config.seed;
			delete config.strength;
			delete config.length;
			delete config.seed;
			localStorage.setObject (key, config);
			localStorage.setObject ("tag:" + tagName, tag);
		}
	}
}

Storage.prototype.migrate_v4 = function () {
	var options = new Object ();
	options.defaultLength = localStorage["option:default_length"];
	options.defaultStrength = localStorage["option:default_strength"];
	options.privateSeed = localStorage["option:private_seed"];
	options.compatibilityMode = localStorage.getBoolean ("option:compatibility_mode");
	options.backedUp = localStorage.getBoolean ("option:backed_up");

	var keys = toArray (localStorage);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (key.startsWith ("option:")) {
			delete localStorage[key];
		} else if (key.startsWith ("url:")) {
			var config = localStorage.getObject (key);
			try {
				if (config.tag.startsWith ("compatible:")) {
					delete config.seed;
					config.tag = config.tag.substringAfter ("compatible:");
				}
				delete config.compatibilitymode;
				delete config.backedup;
				localStorage.setObject (key, config);
			} catch (e) {
				console.log ("failed to migrate " + key);
			}
		}
	}

	localStorage.saveOptions (options);
}

Storage.prototype.migrate_v3 = function () {
	var keys = toArray (localStorage);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (!key.startsWith ("url:")) {
			continue;
		}
		try {
			var config = localStorage.getObject (key);
			var config2 = new Object ();
			config2.tag = config.site;
			for (var property in config) {
				config2[property] = config[property];
			}
			delete config2.site;
			localStorage.setObject (key, config2);
		} catch (e) {
			console.log ("failed to migrate " + key);
		}
	}
}

Storage.prototype.migrate_v2 = function () {
	var keys = toArray (localStorage);
	var reg = new RegExp ("^site:.*$");
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		if (reg.test (key)) {
			var to = "url";
			localStorage[to + key.slice(4)] = localStorage[key];
			delete localStorage[key];
		}
	}
}

Storage.prototype.migrate_v1 = function () {
	var keys = toArray (localStorage);
	var reg = new RegExp ("^compatibility_mode|default_length|default_strength|private_seed|backed_up$");
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		var to = "site";
		if ("version" == key) {
			continue;
		} else if (reg.test (key)) {
			to = "option";
		}
		localStorage[to + ":" + key] = localStorage[key];
		delete localStorage[key];
	}
	localStorage["version"] = "1";
}

Storage.prototype.runMigration = function (toVersion, func) {
	var version = parseInt (localStorage["version"]);
	if (toVersion <= version) {
		return;
	}

	func ();
	localStorage["version"] = toVersion;
}
