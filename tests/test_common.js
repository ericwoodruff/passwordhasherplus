var crypto = require('crypto');
var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;

var tld = require('lib/tld.min.js');

var generateGuid = require('common.js').generateGuid;
var bump = require('common.js').bump;
var grepUrl = require('common.js').grepUrl;
var extractQueryParam = require('common.js').extractQueryParam;
var generateHash = require('common.js').generateHash;

suite('common.js', function() {

    test("generateGuid", function () {
        assert.notEqual(generateGuid(), generateGuid());
    });

    test("bump foo", function () {
        assert.equal(bump("foo"), "foo:1");
    });
    test("bump foo:1", function () {
        assert.equal(bump("foo:1"), "foo:2");
    });
    test("bump foo:100", function () {
        assert.equal(bump("foo:100"), "foo:101");
    });

    test("grepUrl matches simple domain", function () {
        assert.equal(grepUrl("http://foo.com"),"foo");
        assert.equal(grepUrl("https://foo.com"),"foo");
    });

    test("grepUrl matches standard domain", function () {
        assert.equal(grepUrl("http://www.foo.com"),"foo");
    });

    test("grepUrl matches ip addrs", function () {
        assert.equal(grepUrl("http://1.1.1.1"),"1.1.1.1");
        assert.equal(grepUrl("http://111.111.111.111"),"111.111.111.111");
    });

    test("grepUrl matches sub domains", function () {
        assert.equal(grepUrl("http://www2.foo.com"),"foo");
        assert.equal(grepUrl("http://test.foo.com"),"foo");
    });

    test("grepUrl matches uk domains", function () {
        assert.equal(grepUrl("http://www.foo.co.uk"),"foo");
        assert.equal(grepUrl("http://test.foo.co.uk"),"foo");
    });

    test("queryParam finds in 1 param", function () {
        assert.equal(extractQueryParam("http://test.com?foo=true", "foo"),"true");
    });
    test("queryParam finds with no param", function () {
        assert.equal(extractQueryParam("http://test.com", "foo"),null);
        assert.equal(extractQueryParam("http://test.com?a=1", "foo"),null);
    });
    test("queryParam finds wtesth 2 params", function () {
        assert.equal(extractQueryParam("http://test.com?a=1&b=2", "a"),"1");
        assert.equal(extractQueryParam("http://test.com?a=1&b=2", "b"),"2");
    });

});

suite('generateHash', function() {
    var DIGITS = 0;
    var ALPHANUM = 1;
    var SPECIAL = 2;

    var config = {};
    var seed = generateGuid();
    var options = { compatibilityMode: false };
    var input = "mypassword";

    function generate(length, strength) {
        var config = { tag: "mytag", options: options,
            policy: {
                length: length,
                strength: strength,
                seed: seed
            }
        };

        return generateHash(config, input);
    }

    for(i=1; i <= 24; ++i) {
        test("generates "+i+" digit(s)", function () {
            var result = generate(i, DIGITS);
            var result2 = generate(i, DIGITS);
            expect(result.length).to.be.equal(i);
            expect(result).to.match(/^[0-9]+$/);
            expect(result).to.be.equal(result2);
        });

        test("generates "+i+" alphanum(s)", function () {
            var result = generate(i, ALPHANUM);
            var result2 = generate(i, ALPHANUM);
            expect(result.length).to.be.equal(i);
            expect(result).to.match(/^[a-zA-Z0-9]+$/);
            expect(result).to.match(/[0-9]/);
            expect(result).to.be.equal(result2);
        });

        test("generates "+i+" special(s)", function () {
            var result = generate(i, SPECIAL);
            var result2 = generate(i, SPECIAL);
            expect(result.length).to.be.equal(i);
            expect(result).to.match(/^[a-zA-Z0-9!@#$%^&*()\\\/+'",.-]+$/);
            expect(result).to.match(/[!@#$%^&*()\\\/+'",.-]/);
            expect(result).to.be.equal(result2);
        });
    }

    test("ignores seed in compatibility mode", function () {
        var withSeed = generate(24, SPECIAL);
        var result2 = generate(24, SPECIAL);
        options.compatibilityMode = true;
        var withoutSeed = generate(24, SPECIAL);
        seed = generateGuid();
        var withNewSeed = generate(24, SPECIAL);

        expect(withSeed).to.not.be.equal(withoutSeed);
        expect(withoutSeed).to.be.equal(withNewSeed);
        expect(withSeed).to.be.equal(result2);
    });
});
