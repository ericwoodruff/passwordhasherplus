# Developing password hasher plus

To start developing features/fixes for password hasher plus clone this
repository and hack away.

## Manual testing

Once things are ready for testing do this:

* go to `about:debugging` in your firefox
* enable "Enable add-on debugging"
* click on "Load Temporary Add-on"
* pick any file from your password hasher plus source tree

This will load your current password hasher plus tree from disk as an
extension.


## Unit tests

To run the unit-tests do:

    $ npm install mocha

then

    $ (cd tests; make)
