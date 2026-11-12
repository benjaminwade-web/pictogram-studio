// node build.js  -> studio.artifact.html (for publishing) and "Pictogram Studio.html" (double-click on a PC)
const fs = require('fs'), path = require('path'), d = __dirname, r = f => fs.readFileSync(path.join(d, f), 'utf8');
const html = r('editor.src.html').replace('//@@ENGINE', () => r('engine.js')).replace('//@@PRESETS', () => (fs.existsSync(path.join(d, 'presets.example.js')) ? r('presets.example.js') + '\n' : '') + r('presets.js'));
fs.writeFileSync(path.join(d, 'studio.artifact.html'), html);
fs.writeFileSync(path.join(d, 'Pictogram Studio.html'), '<!doctype html><html lang="en"><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
console.log('built', html.length);
