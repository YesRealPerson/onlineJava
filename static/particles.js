let canvas = document.getElementById("canvas");
let ctx = canvas.getContext('2d');
let stars = [];
let FPS = 15;
let mouse = {x: 0,y: 0};
let maxSpeed = window.innerWidth*window.innerHeight / 300000;
let minSpeed = 0.1*maxSpeed;
let lineColor = `rgb(${Math.random()*255+1},${Math.random()*255+1},${Math.random()*255+1})`
let counter = 0;

(function () {
  // resize the canvas to fill browser window dynamically
  window.addEventListener('resize', resizeCanvas, false);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars();
    maxSpeed = window.innerWidth*window.innerHeight / 300000;
    minspeed = 0.1*maxSpeed;
  }

  resizeCanvas();
})();

function generateStars() {
  stars = [];
  let x = Math.floor(window.innerWidth * window.innerHeight / 9000);
  if (x > 500) x = 500;

  for (var i = 0; i < x; i++) {
    let nX = 1;
    if (Math.round(Math.random()) == 0) {
      nX = -1;
    }
    let nY = 1;
    if (Math.round(Math.random()) == 0) {
      nY = -1;
    }
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 1.5,
      vx: nX * (Math.floor(Math.random() * 125) + 25) / 4,
      vy: nY * (Math.floor(Math.random() * 125) + 25) / 4
    });
  }
}

// Draw the scene

function draw() {
  if(counter == FPS*2){
    lineColor = `rgb(${Math.random()*255+1},${Math.random()*255+1},${Math.random()*255+1})`;
    counter = 0;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (var i = 0, x = stars.length; i < x; i++) {
    var s = stars[i];

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.stroke();
  }

  for (var i = 0, x = stars.length; i < x; i++) {
    ctx.beginPath();
    var starI = stars[i];
    ctx.moveTo(starI.x, starI.y);
    if (distance(mouse, starI) < 250) {
      ctx.lineTo(mouse.x, mouse.y);
      ctx.lineWidth = Math.random()*3+2;
      ctx.strokeStyle = lineColor;
    }
    ctx.stroke();
    ctx.beginPath();
    for (var j = 0, x = stars.length; j < x; j++) {
      var starII = stars[j];
      if (distance(starI, starII) < 175) {
        ctx.lineTo(starII.x, starII.y);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'white';
      }
    }
    ctx.stroke();
  }
  counter++;
}

function distance(point1, point2) {
  var xs = 0;
  var ys = 0;

  xs = point2.x - point1.x;
  xs = xs * xs;

  ys = point2.y - point1.y;
  ys = ys * ys;

  return Math.sqrt(xs + ys);
}

// Update star locations

function update() {
  for (var i = 0, x = stars.length; i < x; i++) {
    var s = stars[i];

    s.x += s.vx / FPS;
    s.y += s.vy / FPS;

    if (s.x < 0){
      s.vx = -s.vx * (Math.random() + 0.25);
      s.x = 1;
    }
    if(s.x > canvas.width) {
      s.vx = -s.vx * (Math.random() + 0.25);
      s.x = canvas.width-1;
    }
    if (s.y < 0){
      s.vy = -s.vy * (Math.random() + 0.25);
      s.y = 1;
    } 
    if(s.y > canvas.height) {
      s.vy = -s.vy * (Math.random() + 0.25);
      s.y = canvas.height-1;
    }
    if (s.vx > maxSpeed) s.vx = maxSpeed;
    if (s.vy > maxSpeed) s.vy = maxSpeed;
    if (s.vx < -maxSpeed) s.vx = -maxSpeed;
    if (s.vy < -maxSpeed) s.vy = -maxSpeed;
    if (s.vx < minSpeed && s.vx > 0) s.vx = minSpeed;
    if (s.vy < minSpeed && s.vy > 0) s.vy = minSpeed;
    if (s.vx > -minSpeed && s.vx < 0) s.vx = -minSpeed;
    if (s.vy > -minSpeed && s.vy < 0) s.vy = -minSpeed;
  }
}

canvas.addEventListener('mousemove', function (e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Update and draw

function tick() {
  draw();
  update();
  requestAnimationFrame(tick);
}

tick();