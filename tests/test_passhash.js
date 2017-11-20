#!/usr/bin/node

var assert = require('assert');
var PassHashCommon = require('lib/passhashcommon.js').PassHashCommon;

// global
b64_hmac_sha1 = require("lib/sha1.js").b64_hmac_sha1;

    
suite('PassHashCommon', function() {

    test('generateHashWord sha1', function() {
        var hash =  PassHashCommon.generateHashWord(
            'site', 'master', 14, true, true, true, false, false);
        assert.equal(hash, ',n/pRqqn4rwKvb');
    });
    test('twitter+123456 no reqs', function() {
        var hash = PassHashCommon.generateHashWord(
                'twitter', '123456', 8, false, false, false, false);
        assert.equal(hash, 'scxqJ/Lx');
    });
    test('twitter+aaaaaa no reqs', function() {
        var hash = PassHashCommon.generateHashWord(
                'twitter', 'aaaaaa', 8, false, false, false, false);
        assert.equal(hash, 'q6oCYnFI');
    });
});

