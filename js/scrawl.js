setTimeout(function(){

  paper.install(window);
  paper.setup('x');
  path = new Path({
    strokeCap: 'round',
    strokeColor: new Color(0.1,0.1,0.1),//new Color(0.41,0.62,0.49),
    strokeJoin: 'round',
    strokeWidth: 1
  });
  path.add(view.center);
  var angle = 0, count = 0, run = 0, sign = 1;

  view.onFrame = function(){
    if (!view.bounds.contains(path.bounds)) {
      view.zoom *= 0.9995;
      path.rotate(0.05 * view.zoom * sign);
      path.skew(new Point({
        angle: angle * -180 / Math.PI,
        length: 0.01 * (7/view.zoom)
      }));
    } else if (run % 6400 === 0) {
      sign *= -1;
    }

    if (run ++ % 111 > (run % 67)) {
      if (view.bounds.contains(path.bounds)) {
        view.zoom *= 1.0005;
        path.rotate(0.04 * view.zoom * -1 * sign);
        path.translate(new Point({
          angle: angle * sign * 180 / Math.PI,
          length: 0.05
        }));
      }
      return;
    } else {
       path.rotate(0.05 * view.zoom * sign);
    }

    angle = angle + 6 * Math.PI * Math.SQRT1_2 * ++count;

    if (run % 101 > run % 80) {
      path.curveBy(new Point({
        angle: angle * (30 / Math.PI),
        length: 1 + (0.1 * sign)
      }), new Point({
        angle: angle * (-61 / Math.PI),
        length: 1
      }));
      return;
    }

    path.lineBy(new Point({
      angle: angle * (-180 / Math.PI),
      length: 6 /*+ (Math.random() * 1.5)*/
    }));

  };
}, 100);