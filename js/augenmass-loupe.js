// TODO: make this an object. Needs to have access to the
// background image as well.
var loupe_canvas;
var loupe_ctx;
var loupe_fading_timer;

// Helper to show the 'corner hooks' in the loupe display.
function showQuadBracket(loupe_ctx, loupe_size, bracket_len) {
  loupe_ctx.moveTo(0, bracket_len); // top left.
  loupe_ctx.lineTo(bracket_len, bracket_len);
  loupe_ctx.lineTo(bracket_len, 0);
  loupe_ctx.moveTo(0, loupe_size - bracket_len); // bottom left.
  loupe_ctx.lineTo(bracket_len, loupe_size - bracket_len);
  loupe_ctx.lineTo(bracket_len, loupe_size);
  loupe_ctx.moveTo(loupe_size - bracket_len, 0); // top right.
  loupe_ctx.lineTo(loupe_size - bracket_len, bracket_len);
  loupe_ctx.lineTo(loupe_size, bracket_len); // bottom right.
  loupe_ctx.moveTo(loupe_size - bracket_len, loupe_size);
  loupe_ctx.lineTo(loupe_size - bracket_len, loupe_size - bracket_len);
  loupe_ctx.lineTo(loupe_size, loupe_size - bracket_len);
}

function drawLoupeLine(ctx, line, off_x, off_y, factor) {
  // these 0.5 offsets seem to look inconclusive on Chrome and Firefox.
  // Need to go deeper.
  ctx.beginPath();
  var x1pos = line.p1.x - off_x,
    y1pos = line.p1.y - off_y;
  var x2pos = line.p2.x - off_x,
    y2pos = line.p2.y - off_y;
  ctx.moveTo(x1pos * factor, y1pos * factor);
  ctx.lineTo(x2pos * factor, y2pos * factor);
  ctx.stroke();
  // We want circles that circumreference the pixel in question.
  ctx.beginPath();
  ctx.arc(
    x1pos * factor + 0.5,
    y1pos * factor + 0.5,
    (1.5 * factor) / 2,
    0,
    2 * Math.PI
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(
    x2pos * factor + 0.5,
    y2pos * factor + 0.5,
    (1.5 * factor) / 2,
    0,
    2 * Math.PI
  );
  ctx.stroke();
}

function showLoupe(x, y) {
  if (backgroundImage === undefined || loupe_ctx === undefined) return;

  // if we can fit the loupe right of the image, let's do it. Otherwise
  // it is in the top left corner, with some volatility to escape the cursor.
  var cursor_in_frame_x = x - scrollLeft();
  var cursor_in_frame_y = y - scrollTop() + aug_view.getCanvas().offsetTop;

  // Let's see if we have any overlap with the loupe - if so, move it
  // out of the way.
  var top_default = 10;
  var left_loupe_edge = document.body.clientWidth - loupe_canvas.width - 10;
  if (backgroundImage.width + 40 < left_loupe_edge)
    left_loupe_edge = backgroundImage.width + 40;
  loupe_canvas.style.left = left_loupe_edge;

  // Little hysteresis while moving in and out
  if (
    cursor_in_frame_x > left_loupe_edge - 20 &&
    cursor_in_frame_y < loupe_canvas.height + top_default + 20
  ) {
    loupe_canvas.style.top = loupe_canvas.height + top_default + 60;
  } else if (
    cursor_in_frame_x < left_loupe_edge - 40 ||
    cursor_in_frame_y > loupe_canvas.height + top_default + 40
  ) {
    loupe_canvas.style.top = top_default;
  }

  var loupe_size = loupe_ctx.canvas.width;
  var img_max_x = backgroundImage.width - 1;
  var img_max_y = backgroundImage.height - 1;
  // The size of square we want to enlarge.
  var crop_size = loupe_size / loupe_magnification;
  var start_x = x - crop_size / 2;
  var start_y = y - crop_size / 2;
  var off_x = 0,
    off_y = 0;
  if (start_x < 0) {
    off_x = -start_x;
    start_x = 0;
  }
  if (start_y < 0) {
    off_y = -start_y;
    start_y = 0;
  }
  var end_x = x + crop_size / 2;
  var end_y = y + crop_size / 2;
  end_x = end_x < img_max_x ? end_x : img_max_x;
  end_y = end_y < img_max_y ? end_y : img_max_y;
  var crop_w = end_x - start_x + 1;
  var crop_h = end_y - start_y + 1;
  loupe_ctx.fillStyle = "#777";
  loupe_ctx.fillRect(0, 0, loupe_size, loupe_size);
  off_x -= 0.5;
  off_y -= 0.5;
  loupe_ctx.drawImage(
    backgroundImage,
    start_x,
    start_y,
    crop_w,
    crop_h,
    off_x * loupe_magnification,
    off_y * loupe_magnification,
    loupe_magnification * crop_w,
    loupe_magnification * crop_h
  );

  loupe_ctx.beginPath();
  loupe_ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  loupe_ctx.lineWidth = 1;
  // draw four brackets enclosing the pixel in question.
  var bracket_len = (loupe_size - loupe_magnification) / 2;
  showQuadBracket(loupe_ctx, loupe_size, bracket_len);
  loupe_ctx.stroke();
  loupe_ctx.beginPath();
  loupe_ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  showQuadBracket(loupe_ctx, loupe_size, bracket_len - 1);
  loupe_ctx.stroke();

  loupe_ctx.beginPath();
  loupe_ctx.fillStyle = "#000";
  loupe_ctx.fillText("(" + x + "," + y + ")", 10, 30);
  loupe_ctx.stroke();

  // TODO: we want the loupe-context be scaled anyway, and have this a
  // translation.
  var l_off_x = x - crop_size / 2 + 0.5;
  var l_off_y = y - crop_size / 2 + 0.5;
  // Draw all the lines in the loupe; better 'high resolution' view.
  for (var style = 0; style < 2; ++style) {
    switch (style) {
      case 0:
        loupe_ctx.strokeStyle = background_line_style;
        loupe_ctx.lineWidth = loupe_magnification;
        break;
      case 1:
        loupe_ctx.strokeStyle = line_style;
        loupe_ctx.lineWidth = 1;
        break;
    }
    var model = aug_view.getModel();
    model.forAllLines(function (line) {
      drawLoupeLine(loupe_ctx, line, l_off_x, l_off_y, loupe_magnification);
    });
    if (model.hasEditLine()) {
      drawLoupeLine(
        loupe_ctx,
        model.getEditLine(),
        l_off_x,
        l_off_y,
        loupe_magnification
      );
    }
  }
}

function showFadingLoupe(x, y) {
  if (loupe_fading_timer != undefined) clearTimeout(loupe_fading_timer); // stop scheduled fade-out.
  loupe_canvas.style.transition = "top 0.3s, opacity 0s";
  loupe_canvas.style.opacity = 1;
  showLoupe(x, y);
  // Stay a couple of seconds, then fade away.
  loupe_fading_timer = setTimeout(function () {
    loupe_canvas.style.transition = "top 0.3s, opacity 5s";
    loupe_canvas.style.opacity = 0;
  }, 8000);
}
