#! /bin/make

default: export

version=$(shell grep '"version"' manifest.json  | cut -d: -f2 | cut -d\" -f2)

export=_export

zip=passhashplus-${version}.zip

export:
	rm -f ${zip}
	zip archive/${zip} -r * --exclude archive/*

ff_webext: clean
	zip -r ../passhashplus-${version}.zip * --exclude lib/mocha.* lib/chai.* Makefile spec.js test.html demo.html Screenshot.png

clean:
	find . -name '*.sha256' -delete
	rm -f csp.json

%.sha256: %.js
	cat $< | openssl dgst -sha256 -binary | openssl enc -base64 > $@

update_csp: lib/jquery-3.1.1.min.sha256 lib/sha1.sha256 lib/passhashcommon.sha256 lib/tld.min.sha256 common.sha256 passhashplus.sha256
	rm -f csp.json
	for F in $^; do echo -n "'sha256-`cat $$F`' " >> csp.json; done
	echo "" >> csp.json
