async function rotateImageBlob(blob, degrees) {
  // degrees: 90 or -90
  const img = await loadImage(blob);

  const canvas = document.createElement('canvas');
  const swapDims = Math.abs(degrees) === 90;
  canvas.width = swapDims ? img.height : img.width;
  canvas.height = swapDims ? img.width : img.height;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return new Promise((resolve) => {
    canvas.toBlob((rotatedBlob) => resolve(rotatedBlob), 'image/jpeg', 0.92);
  });
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export { rotateImageBlob };
