/* -*- JavaScript -*- */
/*
 * potential TODO
 * - clean up. This is mostly experimental code right now figuring out how
 *   JavaScript works and stuff :) Put things with their own state in objects.
 * - Endpoints should have the T, but angle-centers just a little circle.
 *   (so: points that have > 1 lines attached to a point)
 * - circle radius estimation (separate mode)
 *    o three dots circle, 4 ellipsis,  but allow multiple dots
 *      and minimize error.
 *    o axis where the center would be plus two dots.
 * - modes: draw single line, polyline, mark circle, select (for devare)
 * - select: left click selects a line (endpoints and center). Highlight;
 *   del devares.
 * - shift + mouse movement: only allow for discrete 360/16 angles.
 * - alt + mouse movement: snap to point in the vicinity.
 * - provide a 'reference straight line' defining the 0 degree angle.
 * - 'collision detection' for labels. Labels should in general be drawn
 *   separately and optimized for non-collision with other labels, lines and
 *   arcs. Make them align with lines, unless too steep angle (+/- 60 degrees?).
 * - checkbox 'show angles', 'show labels'
 * - export as SVG that includes the original image.
 *   background, labels, support-lines (arcs and t-lines) and lines
 *   should be in separate layers to individually look at them.
 *   (exporting just an image with the lines on top crashes browsers; play
 *   with toObjectUrl for download).
 */
"use strict";

// Some constants.

// How lines usually look like (blue with yellow background should make
// it sufficiently distinct in many images).
var line_style = "#00f";
var background_line_style = "rgba(255, 255, 0, 0.4)";
var background_line_width = 7;

// On highlight.
var highlight_line_style = "#f00";
var background_highlight_line_style = "rgba(0, 255, 255, 0.4)";

var length_font_pixels = 12;
var angle_font_pixels = 10;
var loupe_magnification = 7;
var end_bracket_len = 5;

// These variables need to be cut down and partially be private
// to the modules.
var help_system;
var aug_view;
var backgroundImage; // if loaded. Also used by the loupe.

// Init function. Call once on page-load.
function augenmass_init() {

  var help_text = document.getElementById("helptext");
  //help_system = new HelpSystem(help_text);
  if(!help_system) {
    var help_hints = [
      "How to use:",
      "* Left click: draw a line",
      "* Double left click: set line length",
      "* Right click: delete object"
    ];
    help_text.appendChild(document.createElement("br"));
    for (var i = 0; i < help_hints.length; i++) {
      help_text.appendChild(document.createElement("br"));
      help_text.appendChild(document.createTextNode(help_hints[i]));
    }
  }

  aug_view = new AugenmassView(document.getElementById("measure"));
  
  var show_delta_checkbox = document.getElementById("show-deltas");
  show_delta_checkbox.addEventListener("change", function (e) {
    aug_view.setShowDeltas(show_delta_checkbox.checked);
    aug_view.drawAll();
  });

  var show_angle_checkbox = document.getElementById("show-angles");
  show_angle_checkbox.addEventListener("change", function (e) {
    aug_view.setShowAngles(show_angle_checkbox.checked);
    aug_view.drawAll();
  });

  loupe_canvas = document.getElementById("loupe");
  loupe_canvas.style.left = document.body.clientWidth - loupe_canvas.width - 10;
  loupe_ctx = loupe_canvas.getContext("2d");
  // We want to see the pixels:
  loupe_ctx.imageSmoothingEnabled = false;
  loupe_ctx.mozImageSmoothingEnabled = false;
  loupe_ctx.webkitImageSmoothingEnabled = false;

  aug_view.resetWithSize(10, 10); // Some default until we have an image.

  var chooser = document.getElementById("file-chooser");
  chooser.addEventListener("change", function (e) {
    load_background_image(chooser);
  });

  var align = document.getElementById("do-align");
  align.addEventListener("click", function () {
    do_alignment()
  });

  var download_overlay_link = document.getElementById("download-overlay");
  download_overlay_link.addEventListener(
    "click",
    function () {
      download_overlay(download_overlay_link);
    },
    false
  );
  download_overlay_link.style.opacity = 0; // not visible at first.
  download_overlay_link.style.cursor = "default";
  
  var download_composite_link = document.getElementById("download-composite");
  download_composite_link.addEventListener(
    "click",
    function () {
      download_composite(download_composite_link);
    },
    false
  );
  download_composite_link.style.opacity = 0; // not visible at first.
  download_composite_link.style.cursor = "default";
}

function AugenmassController(canvas, view) {
  // This doesn't have any public methods.
  this.start_line_time_ = 0;

  var self = this;
  canvas.addEventListener("mousedown", function (e) {
    extract_event_pos(e, function (e, x, y) {
      self.onClick(e, x, y);
    });
  });
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  canvas.addEventListener("mousemove", function (e) {
    extract_event_pos(e, onMove);
  });
  canvas.addEventListener("dblclick", function (e) {
    extract_event_pos(e, onDoubleClick);
  });
  document.addEventListener("keydown", onKeyEvent);

  function extract_event_pos(e, callback) {
    // browser and scroll-independent extraction of mouse cursor in canvas.
    var x, y;
    if (e.pageX != undefined && e.pageY != undefined) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + scrollLeft();
      y = e.clientY + scrollTop();
    }
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    callback(e, x, y);
  }

  function getModel() {
    return view.getModel();
  }
  function getView() {
    return view;
  }

  function cancelCurrentLine() {
    if (getModel().hasEditLine()) {
      getModel().forgetEditLine();
      getView().drawAll();
    }
  }

  function onKeyEvent(e) {
    if (e.keyCode == 27) {
      // ESC key.
      cancelCurrentLine();
    }
  }

  function onMove(e, x, y) {
    if (backgroundImage === undefined) return;
    var has_editline = getModel().hasEditLine();
    if (has_editline) {
      getModel().updateEditLine(x, y);
    }
    showFadingLoupe(x, y);
    if (!has_editline) return;
    getView().drawAll();
  }

  this.onClick = function (e, x, y) {
    if (e.which != undefined && e.which == 3) {
      // right mouse button.
      if (getModel().hasEditLine()){
        cancelCurrentLine();
      } else{
        // devare line when not editing
        var selected_line = getModel().findClosest(x, y);
        if (selected_line === undefined) return;
        getModel().removeLine(selected_line);
        getModel().removeAngles(selected_line);
        getView().drawAll();
      }
      return;
    }
    var now = new Date().getTime();
    if (!getModel().hasEditLine()) {
      getModel().startEditLine(x, y);
      this.start_line_time_ = now;
      if(help_system) help_system.achievementUnlocked(HelpLevelEnum.DONE_START_LINE);
    } else {
      var line = getModel().updateEditLine(x, y);
      // Make sure that this was not a double-click event.
      // (are there better ways ?)
      if (
        line.length() > 50 ||
        (line.length() > 0 && now - this.start_line_time_ > 500)
      ) {
        getModel().commitEditLine();
        if(help_system) help_system.achievementUnlocked(HelpLevelEnum.DONE_FINISH_LINE);
      } else {
        getModel().forgetEditLine();
      }
    }
    getView().drawAll();
  };

  function onDoubleClick(e, x, y) {
    cancelCurrentLine();
    var selected_line = getModel().findClosest(x, y);
    if (selected_line == undefined) return;
    getView().highlightLine(selected_line);
    var orig_len_txt = (
      getView().getUnitsPerPixel() * selected_line.length()
    ).toPrecision(4);
    var new_value_txt = prompt("Length of selected line ?", orig_len_txt);
    if (orig_len_txt != new_value_txt) {
      var new_value = parseFloat(new_value_txt);
      if (new_value && new_value > 0) {
        getView().setUnitsPerPixel(new_value / selected_line.length());
      }
    }
    if(help_system) help_system.achievementUnlocked(HelpLevelEnum.DONE_SET_LEN);
    getView().drawAll();
  }
}

function scrollTop() {
  return document.body.scrollTop + document.documentElement.scrollTop;
}

function scrollLeft() {
  return document.body.scrollLeft + document.documentElement.scrollLeft;
}

function init_download(filename) {
  var pos = filename.lastIndexOf(".");
  if (pos > 0) {
    filename = filename.substr(0, pos);
  }

  var download_overlay = document.getElementById("download-overlay");
  download_overlay.download = "augenmass-overlay-" + filename + ".png";
  download_overlay.style.cursor = "pointer";
  download_overlay.style.opacity = 1;
  
  var download_composite = document.getElementById("download-composite");
  download_composite.download = "augenmass-composite-" + filename + ".png";
  download_composite.style.cursor = "pointer";
  download_composite.style.opacity = 1;
}

function download_overlay(download_link) {
  if (backgroundImage === undefined) return;
  aug_view.drawAll();
  download_link.href = aug_view.getCanvas().toDataURL("image/png");
}

function download_composite(download_link) {
  if (backgroundImage === undefined) return;
  aug_view.drawAll();

  var canvas = document.createElement('canvas');
  canvas.width = backgroundImage.width;
  canvas.height = backgroundImage.height;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(backgroundImage, 0, 0);
  ctx.drawImage(aug_view.getCanvas(), 0, 0);
  
  download_link.href = canvas.toDataURL("image/png");
  canvas.remove();
}

function load_background_image(chooser) {
  if (chooser.value == "" || !chooser.files[0].type.match(/image.*/)) return;

  var img_reader = new FileReader();
  img_reader.readAsDataURL(chooser.files[0]);
  img_reader.onload = function (e) {
    var new_img = new Image();
    // Image loading in the background canvas. Once we have the image, we
    // can size the canvases to a proper size.
    var background_canvas = document.getElementById("background-img");
    new_img.onload = function () {
      var bg_context = background_canvas.getContext("2d");
      background_canvas.width = new_img.width;
      background_canvas.height = new_img.height;
      bg_context.drawImage(new_img, 0, 0);

      aug_view.resetWithSize(new_img.width, new_img.height);

      if(help_system) help_system.achievementUnlocked(HelpLevelEnum.DONE_FILE_LOADING);
      else {
        var help_text = document.getElementById("helptext");
        while (help_text.firstChild) {
          help_text.removeChild(help_text.lastChild);
        }
      }

      backgroundImage = new_img;
      init_download(chooser.files[0].name);
    };
    new_img.src = e.target.result;
  };
}

function rotate_calc(w, h, a) {
  //right (w, 0)
  var xr =  w * Math.cos(a);
  var yr =  w * Math.sin(a);
  //bottom (0, h)
  var xb = -h * Math.sin(a);
  var yb =  h * Math.cos(a);
  //corner (w, h)
  var xc = w * Math.cos(a) - h * Math.sin(a);
  var yc = w * Math.sin(a) + h * Math.cos(a);
  //new size
  var new_w = Math.max(0, xr, xb, xc) - Math.min(0, xr, xb, xc);
  var new_h = Math.max(0, yr, yb, yc) - Math.min(0, yr, yb, yc);
  var off_x = -Math.min(0, xr, xb, xc);
  var off_y = -Math.min(0, yr, yb, yc);
  return [off_x, off_y, new_w, new_h];
}

function rotate_image(radians) {
  if (backgroundImage === undefined) return;
  var canvas = document.getElementById("background-img");
  var ctx = canvas.getContext("2d");

  //console.log([backgroundImage.width, backgroundImage.height, radians]);
  var offset = rotate_calc(backgroundImage.width, backgroundImage.height, radians);
  //console.log(offset);

  canvas.width = offset[2];
  canvas.height = offset[3];
  ctx.globalCompositeOperation = "copy";
  ctx.translate(offset[0], offset[1]);
  ctx.rotate(radians);
  ctx.drawImage(backgroundImage, 0, 0);
  backgroundImage.src = canvas.toDataURL();
}

function do_alignment() {
  var model = aug_view.getModel();
  if (model.hasEditLine()) return;
  var angle = model.getLineAngle(-1);       //-1 = last line, 0 = first line
  rotate_image(-angle);
}
