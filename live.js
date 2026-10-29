/* Atlas of the walkthrough: show the result of the selection the visitor just ran (kept in this browser only). */
(() => { try { if (new URLSearchParams(location.search).has('live')) { const s = localStorage.getItem('atlas-demo-live'); if (s) window.ATLAS = JSON.parse(s); } } catch (e) { } })();
