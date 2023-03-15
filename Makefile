# Makefile for node-red-contrib-tak
#
# Source:: https://github.com/ampledata/node-red-contrib-tak
# Author:: Greg Albrecht <oss@undef.net>
# Copyright:: Copyright 2023 Greg Albrecht
# License:: Apache License, Version 2.0
#

.DEFAULT_GOAL := all


all: install

install:
	npm install -g .

publish:
	npm publish

lint: jshint eslint jslint

jshint:
	jshint tak/*.js

eslint:
	eslint tak/*.js

jslint:
	jslint tak/*.js

prettier:
	npx prettier --write .
