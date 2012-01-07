#! /bin/make

default: export passhashplus.html

version=$(shell grep version manifest.json  | cut -d: -f2 | cut -d\" -f2)

export=_export

zip=passhashplus-${version}.zip

export:
	rm -f ${zip}
	zip archive/${zip} -r *

passhashplus.html: passhashplus.html.sh
	bash $< > $@
