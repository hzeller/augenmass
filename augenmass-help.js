// We show different help levels. After each stage the user successfully
// performs, the next level is shown. Once the user managed all of them,
// we're fading into silency.
var HelpLevelEnum = {
    HELP_FILE_LOADING:  0,
    HELP_START_LINE:    1,
    HELP_FINISH_LINE:   2,
    HELP_SET_LEN:       3,
    HELP_YOU_ARE_EXPERT_NOW: 4
};
function HelpSystem(helptext_span) {
    this.last_help_level_ = -1;

    this.printLevel = function(requested_level) {
	if (requested_level < this.last_help_level_)
	    return;
	this.last_help_level_ = requested_level;
	var help_text = undefined;
	switch (requested_level) {
	case HelpLevelEnum.HELP_FILE_LOADING:
	    help_text = "(Only your browser reads the image. It is not uploaded anywhere.)"
	    break;
	case HelpLevelEnum.HELP_START_LINE:
	    help_text = "Click somewhere to start a line.";
	    break;
	case HelpLevelEnum.HELP_FINISH_LINE:
	    help_text = "A second click finishes the line. Or Cancel with 'Esc'.";
	    break;
	case HelpLevelEnum.HELP_SET_LEN:
	    help_text = "Double click on length to set relative size.";
	    break;
	case HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW:
	    help_text = "Congratulations - you are an expert now!";
	    break;
	}
	if (help_text != undefined) {
	    while (helptext_span.firstChild) {
		helptext_span.removeChild(helptext.firstChild);
	    }
	    helptext_span.appendChild(document.createTextNode(help_text));
	    
	    if (requested_level == HelpLevelEnum.HELP_YOU_ARE_EXPERT_NOW) {
		helptext_span.style.transition = "opacity 10s";
		helptext_span.style.opacity = 0;
	    }
	}
    }
}
