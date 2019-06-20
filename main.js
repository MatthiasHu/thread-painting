"use strict";

let canvasIn = null;
let canvasOut = null;
let ctxIn = null;
let ctxOut = null;
let pins = [];

function onLoad() {
  document.getElementById("input_image_file").onchange =
    function (e) {onFileChange(e);}
  canvasIn = document.getElementById("canvas_in");
  canvasOut = document.getElementById("canvas_out");
  ctxIn = canvasIn.getContext("2d");
  ctxOut = canvasOut.getContext("2d");
}

function onFileChange(e) {
  let img = document.createElement("img");
  let fr = new FileReader();
  fr.onload = function () {
    img.src = fr.result;
    img.onload = function () {
      handleNewImage(img);
      document.getElementById("canvas_in")
    };
  };
  fr.readAsDataURL(e.target.files[0]);
}

function handleNewImage(img) {
  const w = img.width;
  const h = img.height;
  canvasIn.width = w;
  canvasIn.height = h;
  canvasOut.width = w;
  canvasOut.height = h;
  ctxIn.drawImage(img, 0, 0);

  pins = borderPins(w, h);

  paintingProcess();
}

function borderPins() {
  // TODO
}

function paintingProcess() {
  // TODO
}


// Whole-number coordinates represent centers of pixels.

function linePixelSegments(from, to) {
  const veryLate = 10**10;
  const verySmall = 10**(-10);
  const v = vnormalize(vminus(to, from));
  const xdir = Math.abs(v[0]) < verySmall ? 0 : Math.sign(v[0]);
  const ydir = Math.abs(v[1]) < verySmall ? 0 : Math.sign(v[1]);

  let timeLeft = vmag(vminus(to, from));
  let pixel = [Math.round(from[0]), Math.round(from[1])];
  let here = from;
  let stop = false;
  let segments = [];

  while (stop == false) {
    const xhit = xdir == 0 ? veryLate :
      (0.5*xdir - (here[0]-pixel[0])) / v[0];
    const yhit = ydir == 0 ? veryLate :
      (0.5*ydir - (here[1]-pixel[1])) / v[1];
    let dt = 0;
    let newPixel = [pixel[0], pixel[1]];
    if (xhit < yhit) {
      dt = xhit;
      newPixel[0] += xdir;
    }
    else {
      dt = yhit;
      newPixel[1] += ydir;
    }
    if (dt >= timeLeft) {
      dt = timeLeft;
      stop = true;
    }
    const newHere = vplus(here, vscale(dt, v));
    segments.push(
      { pixel: pixel
      , from: here
      , to: newHere
      });
    here = newHere;
    timeLeft -= dt;
    pixel = newPixel;
  }

  return segments;
}

// A shading is an increase in the darkness of one pixel.

function lineShadings(from, to, strength) {
  return linePixelSegments(from, to).map(s => (
    { pixel: s.pixel
    , additionalShade: strength*vmag(vminus(s.to, s.from))
    }));
}


// Vector functions.

function vplus(a, b) {
  return [a[0]+b[0], a[1]+b[1]];
}
function vminus(a, b) {
  return [a[0]-b[0], a[1]-b[1]];
}
function vscale(s, a) {
  return [s*a[0], s*a[1]];
}
function vtimes(a, b) {
  return a[0]*b[0] + a[1]*b[1];
}
function vmag(a) {
  return Math.sqrt(vtimes(a, a));
}
function vnormalize(a) {
  return vscale(1/vmag(a), a);
}
