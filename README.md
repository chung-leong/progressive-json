# Progressive-json ![ci](https://img.shields.io/github/actions/workflow/status/chung-leong/progressive-json/node.js.yml?branch=main&label=Node.js%20CI&logo=github) ![nycrc config on GitHub](https://img.shields.io/nycrc/chung-leong/progressive-json)

A Javascript library that processes JSON data progressively. Instead of making you wait until
the file transfer has completed, it provides you with continual snapshots of the  object as
data arrives from the remote server: 

![Growing JSON](./doc/img/animation.gif)

Progressive retrieval helps improve preceived load time. This library also lets you download a
JSON file incrementally using 
[HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests), 
making it practical to host data-driven app on static website providers like 
[GitHub Pages](https://pages.github.com/). 

## Feature set

* [Async generator functions for retrieving snapshots of JSON objects](./doc/fetching-and-parsing.md)
* [React hooks for make use of progressively loaded JSON](./doc/using-hooks.md)
* [Server-side functions for efficient streaming of large JSON objects](./doc/server-side-streaming.md)

## How it works

Progress-JSON does not actually perform any JSON parsing on its own. All it does is monitoring the byte stream for certain characters:

![Special characters](./doc/img/characters.jpg)

Shown in black are these special characters: right and left curlies, right and left brackets, comma, double quotation mark, and backslash. Shown with a green background are the locations where the JSON structure can be safely cleaved: immediately before a comma and immediately after a curly or square bracket.

Supposed we want to stop parsing after the first item in `results`. We want to cleave the structure at the spot indicated by the arrow. To make the fragment syntactically correct, we just need to append `] }`. We know that because we've been monitoring the appearances of different brackets. To make the next fragment syntactically correctly, we need to prepend it with `{ "": [`. 

Actual JSON parsing is done by 
[`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse). 