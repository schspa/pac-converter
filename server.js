/*
 * Copyright (c) 2023 Schspa Shi <schspa@gmail.com>.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

const http = require('http');
const vm = require('vm');
const request = require('sync-request');
const url = require('url');

function GetPacHosts(uri) {
    var res = request('GET', uri, {
        headers: {
            'user-agent': 'example-user-agent',
        },
    });

    let body = res.getBody();

    const script = new vm.Script(body);
    const sandbox = { /* add any variables you want to expose to the code */ };
    script.runInThisContext(sandbox);

    let clashrules = 'payload:\n'
    for(var key in autoproxy_host) {
        var value = autoproxy_host[key];
        clashrules += '  - ' + '\'' + key + '\'\n';
    }

    return clashrules;
}

function proxy_to_conf(proxies, name) {
    var re = new RegExp('PROXY ([0-9.]+):([0-9]+)');
    var r  = proxies.match(re);
    var server = r[1];
    var port = r[2];
    var proxy_content = `proxies:
  - name: "${name}"
    type: http
    server: ${server}
    port: ${port}
`
    return proxy_content;
}

function GetPacProxies(uri, name) {
    var res = request('GET', uri, {
        headers: {
            'user-agent': 'example-user-agent',
        },
    });

    let body = res.getBody();

    const script = new vm.Script(body);
    const sandbox = { /* add any variables you want to expose to the code */ };
    script.runInThisContext(sandbox);

    let clashrules = FindProxyForURL('https://www.google.com', 'www.google.com');
    clashrules = proxy_to_conf(clashrules, name)

    return clashrules;
}

const hostname = '0.0.0.0';
const port = 8090;

const server = http.createServer((req, res) => {
    var q = url.parse(req.url, true).query;
    console.log(req.url);

    if (q.url === undefined) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Please add url query')
        return
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    console.log("query arguments:", q);
    try {
        if (q.type === 'proxies' && q.name !== undefined) {
            rules = GetPacProxies(q.url, q.name)
        } else {
            rules = GetPacHosts(q.url)
        }
    } catch (error) {
        console.error(error);
        res.statusCode = 500;
        rules = 'Failed to request ' + q.url;
    }
    res.end(rules);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
