let key = null;

function setKey(k) {
  key = k;
}
function getKey() {
  return key;
}
function clearKey() {
  key = null;
}

export { setKey, getKey, clearKey };
