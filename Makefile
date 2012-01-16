#! /bin/make

default: export passhashplus.html

version=$(shell grep version manifest.json  | cut -d: -f2 | cut -d\" -f2)

export=_export

zip=passhashplus-${version}.zip

export:
	rm -f ${zip}
	zip archive/${zip} -r * --exclude archive/*

passhashplus.html.sh: passhashplus.in.html Makefile
	echo "#!/bin/bash" > $@
	echo "cat <<-EOF" >> $@
	sed -e 's/\$$/\\$$/g' -e 's/ src="\(.*\)">/>$$(cat \1)/' $< >> $@
	echo "EOF" >> $@

passhashplus.html: passhashplus.html.sh
	bash $< > $@
