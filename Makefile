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

%.sha256: %.js
	cat $< | openssl dgst -sha256 -binary | openssl enc -base64 > $@

update_csp: lib/jquery-3.1.1.min.sha256 lib/sha1.sha256 lib/passhashcommon.sha256 lib/tld.min.sha256 common.sha256 passhashplus.sha256 inline_css_csp
	head -n-2 manifest.json > manifest_new.json
	echo -n "\t\"content_security_policy\": \"script-src 'self' " >> manifest_new.json
	for F in $^; do /usr/bin/test -e $$F && echo -n "'sha256-`cat $$F`' " >> manifest_new.json; done || true
	echo "; object-src 'self' `cat inline_css.sha256`\"" >> manifest_new.json
	echo "}" >> manifest_new.json
	mv manifest_new.json manifest.json
	find . -name '*.sha256' -delete

inline_css_csp:
	rm -f inline_css.sha256
	echo -n "'sha256-`echo "* { font-family: Arial; font-size: 12px; }" | openssl dgst -sha256 -binary | openssl enc -base64`' " >> inline_css.sha256
	echo -n "'sha256-`echo "width: 134px;" | openssl dgst -sha256 -binary | openssl enc -base64`' " >> inline_css.sha256
	echo -n "'sha256-`echo "width: 1em;" | openssl dgst -sha256 -binary | openssl enc -base64`' " >> inline_css.sha256
	echo -n "'sha256-`echo "display: none;" | openssl dgst -sha256 -binary | openssl enc -base64`'" >> inline_css.sha256
