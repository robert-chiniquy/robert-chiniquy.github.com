setTimeout(function(){

  var start = Date.now();

  paper.install(window);
  paper.setup('x');

  var canvas = document.getElementById('x');
  var ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'source-over';

  var angle = 0, count = 0, run = 0, sign = 1, lasthit = -10000, opacity = 0.8;
  speed = 1.12;
  view.zoom = 0.7;

  path = new Path({
    strokeCap: 'round',
    strokeColor: new Color(0,0,0),//new Color(0.1,0.1,0.1),//new Color(0.41,0.62,0.49),
    strokeJoin: 'round',
    miterLimit: 2,
    shadowBlur: 0.5,
    strokeWidth: 0.9
//    blendMode: 'color-dodge'
  });
  path.add(view.center);

  view.onFrame = function() {
    var hit = !view.bounds.contains(path.bounds);
    if (hit || run - lasthit < 60) {
      if (lasthit < 0) {
        speed -= 0.2;
      }
      if (hit) {
        speed = speed < 0.1 ? 0.15 : speed - 0.1;
        if (run - lasthit > 180) {
          if (lasthit > 0 && view.zoom <= 1.1) {
            sign *= -1;
          }
          view.zoom *= 0.999;
          if (run - lasthit > 300) {
            lasthit = run;
          }
        } else {
          lasthit = run + 100;
        }
        view.zoom *= 0.99991;
        path.rotate(0.010 * speed * view.zoom * sign);
      }
      path.skew(new Point({
        angle: angle * sign * -180 / Math.PI,
        length: 0.0032 * (8/view.zoom)
      }));
    } else if (run % 6400 === 0) {
      sign *= -1;
    } else if ((view.zoom <= 1 && view.zoom > 0.5) || (lasthit < 0 && view.zoom < 2.3))  {
      if (run % 1000000 <= 800000) {
        opacity -= 0.1;
        path.opacity = opacity;
        lasthit = -10000;
        path.smooth();
      }
    }

    if (run ++ % 111 > (run % 67)) {
      if (!hit) {
        view.zoom *= 1.00032;
        path.rotate(0.015 * speed * view.zoom * sign);
        path.translate(new Point({
          angle: angle * sign * -180 / Math.PI,
          length: 0.009 * speed
        }));
      }
      return;
    } else {
      opacity -= 0.01;
      path.opacity = opacity;
      path.rotate(0.018 * speed * view.zoom * sign);
    }

    if (run > 1000 * 1000 * 1000 * 50 || Date.now() - start > 1000 * 60 * 6) {
      return;
    }

    angle = angle + 6 * Math.PI * Math.SQRT1_2 * ++count;

    if (run % 101 > run % 80) {
      path.curveBy(new Point({
        angle: angle * (30 / Math.PI),
        length: 1 + (0.25 * sign)
      }), new Point({
        angle: angle * (-60 / Math.PI),
        length: 0.4 + (((count / 10000) % 9) / view.zoom)
      }));
      return;
    }

    path.lineBy(new Point({
      angle: angle * (-180 / Math.PI),
      length: 6.8 + (Math.random() % 1.5)
    }));

  };
}, 100);