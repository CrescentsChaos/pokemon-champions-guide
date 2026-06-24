const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const html = fs.readFileSync('e:/DEV/Pokemon Champions Guide/builds/index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on('error', (...err) => console.error('ERROR:', ...err));
virtualConsole.on('jsdomError', (...err) => console.error('JSDOM ERROR:', ...err));

const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole, url: 'http://localhost' });
console.log('Builds script executed successfully!');
