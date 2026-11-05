'use strict';
/* The floor: what Chrome costs to show an extension popup of the same size,
   with no work of ours. Ready synchronously, no IPC, no rendering logic. */
performance.mark('us:boot');
document.documentElement.dataset.ready = '';
performance.mark('us:render');
const i = document.getElementById('in');
i.focus(); i.setSelectionRange(i.value.length, i.value.length);
