
all: js

js: test_common.js test_passhash.js
	NODE_PATH=../ node ../node_modules/.bin/mocha -u tdd --require sinon-chrome --require mock-local-storage $?

