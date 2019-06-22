"use strict";

// line strength in pixels
const strength = 0.2;

let canvasIn = null;
let canvasOut = null;
let ctxIn = null;
let ctxOut = null;
let w = 0;
let h = 0;
let outputPinNumbers = null;
let pins = [];

function onLoad() {
  document.getElementById("input_image_file").onchange =
    function (e) {onFileChange(e);}
  canvasIn = document.getElementById("canvas_in");
  canvasOut = document.getElementById("canvas_out");
  outputPinNumbers = document.getElementById("output_pin_numbers");
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
  w = img.width;
  h = img.height;
  canvasIn.width = w;
  canvasIn.height = h;
  canvasOut.width = w;
  canvasOut.height = h;
  ctxIn.drawImage(img, 0, 0);

  ctxOut.fillStyle = "white";
  ctxOut.fillRect(0, 0, w, h);

  ctxIn.imageData = ctxIn.getImageData(0, 0, w, h);
  ctxOut.imageData = ctxOut.getImageData(0, 0, w, h);

  pins = circlePins(w, h);
  console.log(pins.length + " pins");

  convertInputCanvasToGrey();

  drawPins();

  setTimeout(function () {paintingProcess(0);}, 1);
}

function convertInputCanvasToGrey() {
  const w = canvasIn.width;
  const h = canvasIn.height;

  for (let x=0; x<w; x++) {
    for (let y=0; y<h; y++) {
      putPixel(ctxIn, [x, y], RGBToGrey(getPixelRGB(ctxIn, [x, y])));
    }
  }

  putImageData(ctxIn);
}

function drawPins() {
  for (let i=0; i<pins.length; i++) {
    putPixelRGB(ctxIn, pins[i], [1, 0, 0]);
  }
  putImageData(ctxIn);
}

// always call this after putting pixels
function putImageData(ctx) {
  ctx.putImageData(ctx.imageData, 0, 0);
}

function putPixel(ctx, p, v) {
  putPixelRGB(ctx, p, [v, v, v]);
}
function putPixelRGB(ctx, p, rgb) {
  let data = ctx.imageData.data;
  const n = p[0] + p[1]*w;
  data[n*4 + 0] = rgb[0]*255;
  data[n*4 + 1] = rgb[1]*255;
  data[n*4 + 2] = rgb[2]*255;
  data[n*4 + 3] = 255;
}
function getPixelRGB(ctx, p) {
  let data = ctx.imageData.data;
  const n = p[0] + p[1]*w;
  return (
    [ data[n*4 + 0]/255
    , data[n*4 + 1]/255
    , data[n*4 + 2]/255
    ]);
}
function RGBToGrey(rgb) {
  return (rgb[0]+rgb[1]+rgb[2])/3;
}
function getPixel(ctx, p) {
  return RGBToGrey(getPixelRGB(ctx, p));
}

function borderPins(w, h) {
  const d = 8;

  let pins = [];

  for (let x = d*2; x <= w-d*2; x+=d) {
    pins.push([x, d]);
    pins.push([x, h-d]);
  }
  for (let y = d*2; y <= h-d*2; y+=d) {
    pins.push([d, y]);
    pins.push([w-d, y]);
  }

  return pins;
}

function circlePins(w, h) {
  const n = 100;
  const r = Math.min(w/2, h/2) - 5
  const tau = 2*Math.PI;

  let pins = [];

  for (let i=0; i<n; i++) {
    const alpha = i*tau/n;
    pins.push([w/2 + Math.cos(alpha)*r, h/2 + Math.sin(alpha)*r]);
  }

  return pins;
}

function paintingProcess(pin) {
  console.log("at pin " + pin);
  outputPinNumbers.innerHTML += "" + pin + ", ";

  let bestTargetPin = -1;
  let bestScore = 0;

  for (let i=0; i<pins.length; i++) {
    if (i != pin) {
      const score = scoreLine(pins[pin], pins[i]);
      if (score > bestScore) {
        bestScore = score;
        bestTargetPin = i;
      }
    }
  }

  if (bestTargetPin >= 0) {
    drawLine(pins[pin], pins[bestTargetPin]);
    setTimeout(function () {paintingProcess(bestTargetPin);}, 1);
  }
  else {
    console.log("Done. No positive score from here.");
    outputPinNumbers.innerHTML += "Done.";
  }
}

function scoreLine(from, to) {
  const shadings = lineShadings(from, to, strength);
  let total = vmag(vminus(to, from))*strength;

  let totalScore = 0;

  for (let i=0; i<shadings.length; i++) {
    const score = scoreShading(shadings[i]);
    totalScore += score;
  }

  return totalScore/total;
}

function scoreShading(sh) {
  const a = getPixel(ctxIn, sh.pixel);
  const b = getPixel(ctxOut, sh.pixel);
  const d = sh.additionalShade;

  return (b - a)**2 - (Math.max(0, b-d) - a)**2;
}

function drawLine(from, to) {
  const shadings = lineShadings(from, to, strength);

  for (let i=0; i<shadings.length; i++) {
    const sh = shadings[i];
    const d = sh.additionalShade;
    const old = getPixel(ctxOut, sh.pixel);
    putPixel(ctxOut, sh.pixel, Math.max(0, old - d));
  }

  putImageData(ctxOut);
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
