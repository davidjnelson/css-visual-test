# applications
NODE ?= node
NPM ?= $(NODE) $(shell which npm)

# The `install` task is the default rule in the Makefile.
install: node_modules

# ensures that the `node_modules` directory is installed and up-to-date with
# the dependencies listed in the "package.json" file.
node_modules: package.json
	@$(NPM) prune
	@$(NPM) install
	@touch node_modules

project-unit-test: install
	node_modules/.bin/mocha css-visual-test/test

# run the component library server, building the public app first
componentlibrary: install
	@$(NODE) css-visual-test/component-library-generator.js
	@$(NODE) css-visual-test/component-library-server.js

# run the css visual test tool, building the public app first
visualtest: install
	@$(NODE) css-visual-test/component-library-server.js &
	@$(NODE) css-visual-test/run-visual-tests.js
