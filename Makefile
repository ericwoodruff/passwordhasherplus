#! /bin/make

version=$(shell grep version manifest.json  | cut -d: -f2 | cut -d\" -f2)

export=_export

zip=passhashplus-${version}.zip

export:
	rm -f ${zip}
	rm -rf ./${export}
	svn export . ./${export}
	cd ${export} && zip ../${zip} -r *
	rm -rf ./${export}
