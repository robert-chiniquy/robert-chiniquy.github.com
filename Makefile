# Rebuild the committed HTML from the markdown under site/. Uses site-build
# from PATH, installing it with cargo first when it is not there. Point
# SITE_BUILD at a binary to use that one instead.

SITE_BUILD ?= site-build

.DEFAULT_GOAL := html

.PHONY: html install-site-build

html:
	@command -v $(SITE_BUILD) >/dev/null || $(MAKE) install-site-build
	$(SITE_BUILD) site .

# The same install the monthly rebuild workflow uses.
install-site-build:
	cargo install --locked --git https://github.com/robert-chiniquy/dotfiles --branch master site-build
