
all: js

js: test*.js
	NODE_PATH=../ node ../node_modules/.bin/mocha -u tdd $?

