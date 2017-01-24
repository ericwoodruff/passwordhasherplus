#! /bin/make

default: export

version=$(shell grep '"version"' manifest.json  | cut -d: -f2 | cut -d\" -f2)

export=_export

zip=passhashplus-${version}.zip

export:
	rm -f ${zip}
	zip archive/${zip} -r * --exclude archive/*

ff_webext:
	zip -r ../passhashplus-${version}.zip * --exclude lib/mocha.* lib/chai.*
