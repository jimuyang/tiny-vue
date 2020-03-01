function Vue(options) {
    test(options.el)
}

function test(el) {
    let rootNode = document.querySelector(el)
    let html = rootNode.outerHTML
    console.log(html.trim())
}

function parseHTML(html) {
    let index = 0
    while (html) {
        let tagStart = html.indexOf('<')
        if (tagStart === 0) {
        }
    }

    function advance(n) {
        index += n
        html = html.substring(n)
    }

    function parseStartTag() {

    }
}


/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap(
    str,
    expectsLowerCase
) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase
        ? function (val) { return map[val.toLowerCase()]; }
        : function (val) { return map[val]; }
}


