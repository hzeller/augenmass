// We show different help levels. After each stage the user successfully
// performs, the next level is shown. Once the user managed all of them,
// we're fading into silency.
var HelpLevelEnum = {
    DONE_FILE_LOADING:  0,
    DONE_START_LINE:    1,
    DONE_FINISH_LINE:   2,
    DONE_ADD_ANGLE:     3,
    DONE_SET_LEN:       4,
};

// Constructor function.
function HelpSystem(helptext_span) {
    this.last_help_level_ = -1;

    // Initial text.
    printHelp("(Only your browser reads the image. It is not uploaded anywhere.)");

    this.achievementUnlocked = function(level) {
	if (level < this.last_help_level_)
	    return;
	this.last_help_level_ = level;
	printLevel(level);
    }

    function printLevel(requested_level) {
	switch (requested_level) {
	case HelpLevelEnum.DONE_FILE_LOADING:
	    printHelp("Click somewhere to start a line.");
	    break;
	case HelpLevelEnum.DONE_START_LINE:
	    printHelp("A second click finishes the line. Or Cancel with 'Esc'.");
	    break;
	case HelpLevelEnum.DONE_FINISH_LINE:
	    printHelp("TIP: starting a line where another ends measures their angles.");
	    break;
	case HelpLevelEnum.DONE_ADD_ANGLE:
	    printHelp("Double click on center of line to set relative size.");
	    break;
	case HelpLevelEnum.DONE_SET_LEN:
	    printHelp("Congratulations - you are an expert now!", true);
	    break;
	}
    }

    function printHelp(help_text, fade_away) {
	if (help_text == undefined) return;
	while (helptext_span.firstChild) {
	    helptext_span.removeChild(helptext.firstChild);
	}
	helptext_span.appendChild(document.createTextNode(help_text));
	
	if (fade_away != undefined && fade_away) {
	    helptext_span.style.transition = "opacity 10s";
	    helptext_span.style.opacity = 0;
	}
    }
}
