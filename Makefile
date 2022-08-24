# Makefile for node-red-contrib-tak
#
# Source:: https://github.com/ampledata/node-red-contrib-tak
# Author:: Greg Albrecht W2GMD <oss@undef.net>
# Copyright:: Copyright 2022 Greg Albrecht
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
	jshint *.js

eslint:
	eslint *.js

jslint:
	jslint *.js
