#! /usr/bin/env node

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var cheerio = require('cheerio');
var typeset = require('typeset');
var marked = require('meta-kramed');
var highlightjs = require('highlight.js');
var capitalize = require('capitalize');
var logmagic = require('logmagic');
logmagic.route("__root__", logmagic.DEBUG, "console");
var log = logmagic.local("generate-docs");


var DISTDIR = 'dist';

// Usage
// ./generate.js --page page.html <list of .md files>

main();


function main() {
  var argv = require('minimist')(process.argv.slice(process.argv[0].indexOf('./') === 0 ? 1 : 2), {
    string: [
      'page',
    ]
  });

  validate(argv);

  build_pages(argv.page, argv._);

  process.exit(0);
}

function validate(argv) {
  assert(argv.page, "pls pass --page <page html template>");
  assert(argv._.length > 0, "pls list some .md files");
}

function write_file(filename, contents) {
  log.debug('write_file', {
    path: filename
  });
  fs.writeFileSync(filename, contents);
}

function get_meta(file) {
  var src = fs.readFileSync(file).toString();
  var contents = marked(src);
  log.trace('get_meta', {
    file: file,
    meta: contents.meta
  });
  return contents.meta || {};
}

function mdToHtml(name) {
  return path.basename(name, '.md') + ".html";
}

function build_page(page_tpl, file, next_file) {
  var $ = cheerio.load(fs.readFileSync(page_tpl).toString());
  var src = fs.readFileSync(file).toString();
  var contents = marked(src);
  var meta = get_meta(file);

  contents = typeset(contents.html);

  if (meta.title) {
    $('#content').append('<h1>' + meta.title + '</h1>');
  }

  $('#content').append(contents);

  var next_title = get_meta(next_file).title;

  $('#next').append("And then… <a href='/" + mdToHtml(next_file) + "'>" + next_title + "</a>");

  var doc = '<!DOCTYPE html>\n' + $.html();
  write_file(mdToHtml(file), doc);
}

function build_pages(page_tpl, files) {
  _.each(_.sortBy(files, function(f) {
    return get_meta(f).order;
  }), function(f, index, list) {
    var next_index = index + 1 >= list.length ? 0 : index + 1;
    build_page(page_tpl, f, list[next_index]);
  });
}

marked.setOptions({
  highlight: function(code) {
    return highlightjs.highlightAuto(code).value;
  }
});

