mocha.ui('bdd');
mocha.reporter('html');
var expect = chai.expect;

describe("guid", function () {
	it("generates uniquely", function () {
		expect(generateGuid()).not.to.be.equal(generateGuid());
	});
});

describe("bump", function () {
	it("bumps foo", function () {
		expect(bump("foo")).to.be.equal("foo:1");
	});
	it("bumps foo:1", function () {
		expect(bump("foo:1")).to.be.equal("foo:2");
	});
	it("bumps foo:100", function () {
		expect(bump("foo:100")).to.be.equal("foo:101");
	});
});

describe("grepUrl", function () {
	it("matches simple domain", function () {
		expect(grepUrl("http://foo.com")).to.be.equal("foo");
		expect(grepUrl("https://foo.com")).to.be.equal("foo");
	});

	it("matches standard domain", function () {
		expect(grepUrl("http://www.foo.com")).to.be.equal("foo");
	});

	it("matches ip addrs", function () {
		expect(grepUrl("http://1.1.1.1")).to.be.equal("1.1.1.1");
		expect(grepUrl("http://111.111.111.111")).to.be.equal("111.111.111.111");
	});

	it("matches sub domains", function () {
		expect(grepUrl("http://www2.foo.com")).to.be.equal("foo");
		expect(grepUrl("http://test.foo.com")).to.be.equal("foo");
	});

	it("matches uk domains", function () {
		expect(grepUrl("http://www.foo.co.uk")).to.be.equal("foo");
		expect(grepUrl("http://test.foo.co.uk")).to.be.equal("foo");
	});
});

describe("queryParam", function () {
	it("finds in 1 param", function () {
		expect(extractQueryParam("http://test.com?foo=true", "foo")).to.be.equal("true");
	});
	it("finds with no param", function () {
		expect(extractQueryParam("http://test.com", "foo")).to.be.equal(null);
		expect(extractQueryParam("http://test.com?a=1", "foo")).to.be.equal(null);
	});
	it("finds with 2 params", function () {
		expect(extractQueryParam("http://test.com?a=1&b=2", "a")).to.be.equal("1");
		expect(extractQueryParam("http://test.com?a=1&b=2", "b")).to.be.equal("2");
	});
});

describe("generateHash", function () {
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
	it("generates "+i+" digit(s)", function () {
		var result = generate(i, DIGITS);
		var result2 = generate(i, DIGITS);
		expect(result.length).to.be.equal(i);
		expect(result).to.match(/^[0-9]+$/);
		expect(result).to.be.equal(result2);
	});

	it("generates "+i+" alphanum(s)", function () {
		var result = generate(i, ALPHANUM);
		var result2 = generate(i, ALPHANUM);
		expect(result.length).to.be.equal(i);
		expect(result).to.match(/^[a-zA-Z0-9]+$/);
		expect(result).to.match(/[0-9]/);
		expect(result).to.be.equal(result2);
	});

	it("generates "+i+" special(s)", function () {
		var result = generate(i, SPECIAL);
		var result2 = generate(i, SPECIAL);
		expect(result.length).to.be.equal(i);
		expect(result).to.match(/^[a-zA-Z0-9!@#$%^&*()\\\/+'",.-]+$/);
		expect(result).to.match(/[!@#$%^&*()\\\/+'",.-]/);
		expect(result).to.be.equal(result2);
	});
	}

	it("ignores seed in compatibility mode", function () {
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

describe("localStorage", function () {
	it("can clear, dump and migrate", function () {
		localStorage.clear ();
		var dump = dumpDatabase ();
		expect(JSON.stringify(JSON.parse(dump))).to.be.equal(JSON.stringify({}));
		localStorage.migrate ();
		dump = dumpDatabase ();
		expect(JSON.stringify(JSON.parse(dump))).to.not.be.equal(JSON.stringify({}));
	});

	it("can save and load config", function () {
		var seed = generateGuid();
		var options = { compatibilityMode: false };
		var input = "mypassword";

		var config = { tag: "mytag", options: options,
			policy: {
				length: 8,
				strength: 2,
				seed: seed
			},
			fields: ["abc", "def"]
		};

		localStorage.saveConfig("foo", config);

		var loaded = localStorage.loadConfig("foo");

		expect(loaded.tag).to.be.equal(config.tag);
		expect(loaded.policy).to.be.eql(config.policy);
		expect(loaded.fields).to.be.eql(config.fields);
	});

	it("can load tags", function () {
		var tags = localStorage.loadTags();
		expect(tags.length).to.be.equal(1);
		expect(tags[0]).to.be.equal("mytag");
	});

	it("can collect garbage", function () {
		var seed = generateGuid();
		var options = { compatibilityMode: false };
		var input = "mypassword";
		var config = { tag: "othertag", options: options,
			policy: {
				length: 8,
				strength: 2,
				seed: seed
			},
			fields: []
		};

		localStorage.saveConfig("foo", config);

		var tags = localStorage.loadTags();
		expect(tags.length).to.be.equal(2);

		localStorage.collectGarbage();

		var tags = localStorage.loadTags();
		expect(tags.length).to.be.equal(1);
	});

	/*
	it("can migrate", function () {
		// TODO
	});
	*/
});

mocha.run();
