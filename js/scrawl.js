setTimeout(function(){

  var start = Date.now();

  paper.install(window);
  paper.setup('x');

  path = new Path({
    strokeCap: 'round',
    strokeColor: new Color(0.1,0.1,0.1),//new Color(0.41,0.62,0.49),
    strokeJoin: 'round',
    miterLimit: 5,
    shadowBlur: 0.5,
    strokeWidth: 0.9
  });
  path.add(view.center);
  var angle = 0, count = 0, run = 0, sign = 1, lasthit = -10000;
  view.zoom = 0.7;

  view.onFrame = function() {

    if (!view.bounds.contains(path.bounds) || run - lasthit < 60) {
      if (!view.bounds.contains(path.bounds)) {
        if (run - lasthit > 180) {
          if (lasthit > 0 && view.zoom <= 1.1) {
            sign *= -1;
          }
          lasthit = run;
        } else {
          lasthit = run + 100;
        }
      }
      view.zoom *= 0.9991;
      path.rotate(0.010 * view.zoom * sign);
      path.skew(new Point({
        angle: angle * sign * -180 / Math.PI,
        length: 0.009 * (8/view.zoom)
      }));
    } else if (run % 6400 === 0) {
      sign *= -1;
    } else if ((view.zoom <= 1 && view.zoom > 0.5) || (lasthit < 0 && view.zoom < 2.3))  {
      if (run % 1000000 <= 800000) {
        lasthit = -10000;
        path.smooth();
        if (run > 1000 * 1000 * 1000 * 1000 || Date.now() - start > 1000 * 60 * 6) {
          view.onFrame = function() {};
        }
      }
    }

    if (run ++ % 111 > (run % 67)) {
      if (view.bounds.contains(path.bounds)) {
        view.zoom *= 1.00032;
        path.rotate(0.015 * view.zoom * sign);
        path.translate(new Point({
          angle: angle * sign * -180 / Math.PI,
          length: 0.035
        }));
      }
      return;
    } else {
       path.rotate(0.018 * view.zoom * sign);
    }

    angle = angle + 6 * Math.PI * Math.SQRT1_2 * ++count;

    if (run % 101 > run % 80) {
      path.curveBy(new Point({
        angle: angle * (30 / Math.PI),
        length: 1 + (0.25 * sign)
      }), new Point({
        angle: angle * (-61 / Math.PI),
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