const { Client } = require("@notionhq/client");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
var beautify_html = require("js-beautify").html;
const { makeConsoleLogger } = require("@notionhq/client/build/src/logging");

const notion = new Client({
  auth: process.env.NOTION_KEY,
});

console.log(notion.databases);
console.log(notion.pages);
console.log(notion.blocks);

function validURL(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

function htmlExtras(phrase, html_text) {
  if (phrase.annotations.bold) {
    html_text = "<b>" + html_text + "</b>";
  }
  if (phrase.annotations.italic) {
    html_text = "<i>" + html_text + "</i>";
  }
  if (phrase.annotations.underline) {
    html_text = "<u>" + html_text + "</u>";
  }
  if (phrase.annotations.strikethrough) {
    html_text = "<s>" + html_text + "</s>";
  }
  if (phrase.annotations.code) {
    html_text = "<code>" + html_text + "</code>";
  }
  if (phrase.href) {
    html_text = "<a href='" + phrase.href + "'>" + html_text + "</a>";
  }
  return html_text;
}

async function getTitle(pageid) {
  var data = await notion.pages.retrieve({
    page_id: pageid,
  });
  return data.properties.Name.title[0].plain_text;
}

async function getAuthor(pageid) {
  var data = await notion.pages.retrieve({
    page_id: pageid,
  });
  console.log(data);
  author = data.properties;
  console.log(author);
  return author.Author.rich_text[0].plain_text;
}

async function getVideo(pageid) {
  var data = await notion.pages.retrieve({
    page_id: pageid,
  });
  console.log(data);
  var video = data.properties;
  console.log(video);
  return video.Video.url;
}

async function getPages(dbid) {
  let data = await notion.databases.query({
    database_id: dbid,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  var pages = data.results.map((page) => {
    return page.id;
  });
  return pages;
}

async function printList(dbid, path) {
  var html = "";
  var pages = await getPages(dbid);
  for (page of pages) {
    title = await getTitle(page);
    html += `<li><a href="` + path + title + `.html">` + title + `</a></li>`;
  }
  return html;
}

async function printPage(pageid) {
  var html = "";
  let data = await notion.blocks.children.list({
    block_id: pageid,
  });
  for (block of data.results) {
    if (block["type"] === "heading_1") {
      if (block["heading_1"].hasOwnProperty("text")) {
        text = block["heading_1"]["text"];
        for (phrase of text) {
          var html_text = "<br /><h1>" + phrase.plain_text + "</h1>";
          html_text = htmlExtras(phrase, html_text);
        }
      }
    } else if (block["type"] === "heading_2") {
      if (block["heading_2"].hasOwnProperty("text")) {
        text = block["heading_2"]["text"];
        for (phrase of text) {
          var html_text = "<br /><h2>" + phrase.plain_text + "</h2>";
          html_text = htmlExtras(phrase, html_text);
        }
      }
    } else if (block["type"] === "heading_3") {
      if (block["heading_3"].hasOwnProperty("text")) {
        text = block["heading_3"]["text"];
        for (phrase of text) {
          var html_text = "<br /><h3>" + phrase.plain_text + "</h3>";
          html_text = htmlExtras(phrase, html_text);
        }
      }
    } else if (block["type"] === "paragraph") {
      if (block["paragraph"].hasOwnProperty("text")) {
        text = block["paragraph"]["text"];
        for (phrase of text) {
          if (validURL(phrase.plain_text)) {
            html_text = "<br /><img src='" + phrase.plain_text + "'/>";
          } else {
            var html_text = "<p>" + phrase.plain_text + "</p>";
            html_text = htmlExtras(phrase, html_text);
          }
        }
      } else {
        html_text = "<br />";
      }
    }
    html += html_text;
    html_text = "";
  }
  return html;
}

// Individual functions

async function updateWriting(dbid) {
  var html = `<!DOCTYPE html>
  <html lang="en">
    <meta charset="UTF-8" />
    <head>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Michael Beer</title>
      <link rel="stylesheet" href="style.css" />
    </head>
    <body>
      <header>
        <h1><a href="index.html" class="a-index">Michael Beer</a></h1>
        <ul>
          <li><a href="writing.html">Writing</a></li>
          <li>
            <a href="books.html">Books</a>
          </li>
          <li>
            <a href="projects.html">Projects</a>
          </li>
        </ul>
      </header>
      <main>
        <h2>Writing</h2><ul>`;
  var list = await printList(dbid, "writing/");
  html += list;
  html = beautify_html(html);
  fs.writeFile("writing.html", html, (err) => {
    console.log(err);
  });
  var html = `<!DOCTYPE html>
  <html lang="en">
  <meta charset="UTF-8" />
  <head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Michael Beer</title>
  <link rel="stylesheet" href="../style.css" />
  </head>
  <body>
      <header><h1><a href="../index.html" class="a-index">Michael Beer</a></h1>
      </header>
      <main>
      <a href="../writing.html">Back</a>`;
  var pages = await getPages(dbid);
  for (page of pages) {
    var pagehtml = html + (await printPage(page));
    var title = await getTitle(page);
    pagehtml = beautify_html(pagehtml);
    fs.writeFile("writing/" + title + ".html", pagehtml, (err) => {
      console.log(err);
    });
  }
}

async function updateProjects(dbid) {
  var html = `<!DOCTYPE html>
  <html lang="en">
    <meta charset="UTF-8" />
    <head>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Michael Beer</title>
      <link rel="stylesheet" href="style.css" />
    </head>
    <body>
      <header>
        <h1><a href="index.html" class="a-index">Michael Beer</a></h1>
        <ul>
          <li><a href="writing.html">Writing</a></li>
          <li>
            <a href="books.html">Books</a>
          </li>
          <li>
            <a href="projects.html">Projects</a>
          </li>
        </ul>
      </header>
      <main>
        <h2>Projects</h2><ul>`;
  var pages = await getPages(dbid);
  for (page of pages) {
    title = await getTitle(page);
    console.log(page);
    video = await getVideo(page);
    console.log(video);
    html +=
      `<li><a target="_blank" href="` + video + `">` + title + `</a></li>`;
  }
  html = beautify_html(html);
  fs.writeFile("projects.html", html, (err) => {
    console.log(err);
  });
}

async function updateBooks(dbid) {
  var html = `<!DOCTYPE html>
  <html lang="en">
    <meta charset="UTF-8" />
    <head>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Michael Beer</title>
      <link rel="stylesheet" href="style.css" />
    </head>
    <body>
      <header>
        <h1><a href="index.html" class="a-index">Michael Beer</a></h1>
        <ul>
          <li><a href="writing.html">Writing</a></li>
          <li>
            <a href="books.html">Books</a>
          </li>
          <li>
            <a href="projects.html">Projects</a>
          </li>
        </ul>
      </header>
      <main>
        <h2>Favourite Books</h2><ul>`;
  var pages = await getPages(dbid);
  for (page of pages) {
    title = await getTitle(page);
    var author = await getAuthor(page);
    html += `<li>` + title + ` - ` + author + `</li>`;
  }
  html = beautify_html(html);
  fs.writeFile("books.html", html, (err) => {
    console.log(err);
  });
}

updateWriting("f9f00195-8a9a-4296-a450-77666760d624");
//console.log("Writing complete");
updateBooks("6c41a8e00cbe420f87c6ab588ed98933");
console.log("Books complete");
updateProjects("438fe6b561bc417988484bbfc5b09a7a");
