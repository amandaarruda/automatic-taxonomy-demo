/* Runs the product's Python discovery code (observable_atlas) in a Web Worker with Pyodide.
   Downloads come only from the Pyodide CDN and this site; nothing is uploaded. */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
importScripts(PYODIDE + 'pyodide.js');
let ready = null;
const post = message => self.postMessage(message);

async function init() {
  post({ type: 'status', key: 'runtime' });
  const py = await loadPyodide({ indexURL: PYODIDE });
  post({ type: 'status', key: 'packages' });
  await py.loadPackage(['numpy', 'scipy', 'scikit-learn']);
  post({ type: 'status', key: 'code' });
  const [bundle, corpus] = await Promise.all([
    fetch('py/observable_atlas.zip').then(r => r.arrayBuffer()),
    fetch('data/corpus.json').then(r => r.text())]);
  py.unpackArchive(bundle, 'zip', { extractDir: '/home/pyodide/app' });
  py.runPython("import sys; sys.path.insert(0, '/home/pyodide/app')");
  const runner = py.pyimport('browser_runner');
  runner.load(corpus);
  post({ type: 'status', key: 'ready', version: py.version });
  return runner;
}

self.onmessage = async ({ data }) => {
  const { id, request } = data;
  try {
    ready ||= init();
    const runner = await ready;
    if (!request) return;
    const started = performance.now();
    const payload = runner.run(JSON.stringify(request), line => post({ type: 'progress', id, event: JSON.parse(line) }));
    post({ type: 'result', id, payload, seconds: (performance.now() - started) / 1000 });
  } catch (error) {
    post({ type: 'error', id, message: String((error && error.message) || error).split('\n').slice(-3).join(' ') });
  }
};
