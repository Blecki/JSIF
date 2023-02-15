/***
 *     ██████╗ ██╗   ██╗████████╗██████╗ ██╗   ██╗████████╗
 *    ██╔═══██╗██║   ██║╚══██╔══╝██╔══██╗██║   ██║╚══██╔══╝
 *    ██║   ██║██║   ██║   ██║   ██████╔╝██║   ██║   ██║   
 *    ██║   ██║██║   ██║   ██║   ██╔═══╝ ██║   ██║   ██║   
 *    ╚██████╔╝╚██████╔╝   ██║   ██║     ╚██████╔╝   ██║   
 *     ╚═════╝  ╚═════╝    ╚═╝   ╚═╝      ╚═════╝    ╚═╝   
 *                                                         
 */

/*
  Can't have a game without OUTPUT. It's up to the page wrapper to actually handle displaying the generated text.
*/

var EMISSION_QUEUE = "";

function EMIT(text, arguments, options) {
  if (text === undefined)
    return;
  if (text instanceof Function)
    EMIT(text(), arguments, options);

  for (var i = 0; i < text.length; i += 1) {
    if (text.charAt(i) == '{' && (options === undefined || options.EXPAND == true)) {
      var expansionId = "";
      i += 1; // Skip the opening {

      while (i < text.length && text.charAt(i) != '}') {
        expansionId += text.charAt(i);
        i += 1;
      } 

      //i += 1; // Skip the closing }

      if (arguments === undefined || arguments[expansionId] === undefined) EMIT("{ERROR}", null, options);
      else CONSIDER("NAMING", arguments[expansionId]);
    }
    else
      EMISSION_QUEUE += text.charAt(i);
  }
}

function GET_EMISSION_QUEUE() {
  return EMISSION_QUEUE;
}

function CLEAR_EMISSION_QUEUE() {
  EMISSION_QUEUE = "";
}

/*
  This function should be called after all rules are defined and before any input is processed.
*/
function START_GAME() {
  PREPARE_RULES();
}

/* 
    ██████╗ ██╗   ██╗██╗     ███████╗██████╗  ██████╗  ██████╗ ██╗  ██╗███████╗
    ██╔══██╗██║   ██║██║     ██╔════╝██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝██╔════╝
    ██████╔╝██║   ██║██║     █████╗  ██████╔╝██║   ██║██║   ██║█████╔╝ ███████╗
    ██╔══██╗██║   ██║██║     ██╔══╝  ██╔══██╗██║   ██║██║   ██║██╔═██╗ ╚════██║
    ██║  ██║╚██████╔╝███████╗███████╗██████╔╝╚██████╔╝╚██████╔╝██║  ██╗███████║
    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝
*/

/*
  Following the execution model of Inform7, all actions are governed by RULEBOOKS. 
  A RULE is really just a piece of code that gets run under a specific condition, 
    and RULEBOOKS are a group of these RULES.
  INSTEAD RULES are checked first, and if any match, they will be executed and execution will stop.
  PERFORM RULES are run in order if none of the INSTEAD RULES matched.
*/
class RULEBOOK {
  NAME;
  INSTEAD_RULES;
  PERFORM_RULES;

  constructor(NAME) {
    this.NAME = NAME;
    this.INSTEAD_RULES = [];
    this.PERFORM_RULES = [];
  }
}

class RULE {
  _WHEN;
  _THEN;
  ORDER;

  constructor() {
    this._WHEN = _ => true;
    this._THEN = _ => {};
    this.ORDER = 1;
  }

  LAST() {
    this.ORDER = 2;
    return this;
  }

  FIRST() {
    this.ORDER = 0;
    return this;
  }

  toString() {
    return "WHEN [" + String(this._WHEN) + "] THEN [" + String(this._THEN) + "]";
  }

  WHEN(criteria) {
    this._WHEN = criteria;
    return this;
  }

  THEN(code) {
    if (typeof code == "string") {
      var inner_text = code;
      code = _ => EMIT(inner_text);
    }

    this._THEN = code;
    return this;
  }
}

/* Wait, why are these in the global namespace? To make the code simpler and easier to understand. There's no dependancies so who cares? */
var GLOBAL_RULES = {};

/* This must be called after all the custom rulebooks for the game are declared, to put them in the proper order. */
function PREPARE_RULES() {
  for (var rulebookName in GLOBAL_RULES) {
    if (GLOBAL_RULES[rulebookName] instanceof RULEBOOK) {
      GLOBAL_RULES[rulebookName].INSTEAD_RULES.sort((a, b) => a.ORDER - b.ORDER);
      GLOBAL_RULES[rulebookName].PERFORM_RULES.sort((a, b) => a.ORDER - b.ORDER);
    }
  }
}

const RULE_RESULT = {
	CONTINUE: Symbol("RULE_RESULT_CONTINUE"),
  ABORT: Symbol("RULE_RESULT_ABORT") // Return this from a PERFORM RULE to stop considering the RULEBOOK.
};

/* 
  Declare a PERFORM RULE in the given RULEBOOK.
*/
function PERFORM(rulebook_name) {
  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name))
    GLOBAL_RULES[rulebook_name] = new RULEBOOK(rulebook_name);
  var r = new RULE();
  GLOBAL_RULES[rulebook_name].PERFORM_RULES.push(r);
  return r;
}

/* 
  Declare an INSTEAD RULE in the given RULEBOOK.
*/
function INSTEAD(rulebook_name) {
  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name))
    GLOBAL_RULES[rulebook_name] = new RULEBOOK(rulebook_name);
  var r = new RULE();
  GLOBAL_RULES[rulebook_name].INSTEAD_RULES.push(r);
  return r;
}

/*
  Consider a RULEBOOK, executing any appropriate RULES.
*/
function CONSIDER(rulebook_name, arguments) {
  if (RULES_TRACE) {
    console.log("! CONSIDERING RULEBOOK " + rulebook_name);
    console.log(arguments);
  }

  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name)) {
    if (RULES_TRACE) console.log("! NO SUCH RULEBOOK.");
    return;
  }

  // First check the INSTEAD RULES. If one matches, execute it and stop considering.
  var matched_instead_rule = false;
  for (var rule of GLOBAL_RULES[rulebook_name].INSTEAD_RULES) {
    if (RULES_TRACE) console.log("! CHECKING INSTEAD " + rulebook_name + " " + String(rule));
    if (rule._WHEN(arguments)) {
      if (RULES_TRACE) console.log("! MATCHED, EXECUTING.");
      rule._THEN(arguments); // Result type of instead rules does not matter; they always abort. BUT - they need a way to report 'failure' or 'success'.
      if (RULES_TRACE) console.log("! DONE CONSIDERING.");
      return;
    }
    else {
      if (RULES_TRACE) console.log("! DIDN'T MATCH");
    }
  }

  // Now check the PERFORM RULES.
  for (var rule of GLOBAL_RULES[rulebook_name].PERFORM_RULES) {
    if (RULES_TRACE) 
      console.log("! CHECKING PERFORM " + rulebook_name + " " + String(rule));

    if (rule._WHEN(arguments)) {
      if (RULES_TRACE) console.log("! MATCHED, EXECUTING.");
      var rule_result = rule._THEN(arguments);
      if (rule_result == RULE_RESULT.ABORT) { // Normally all PERFORM RULES are run, but they can abort execution.
        if (RULES_TRACE) console.log("! RULE ABORTED CONSIDERATION, DONE CONSIDERING.");
        return;
      }      
    }
    else {
      if (RULES_TRACE) console.log("! DIDN'T MATCH");
    }
  }

  if (RULES_TRACE) console.log("! DONE CONSIDERING.");
}

/***
 *    ██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗ 
 *    ██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
 *    ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
 *    ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
 *    ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
 *     ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ 
 *                                               
 */

/*
  The WORLD MODEL represents the rooms, objects, and exits in the game.
  Wait, why is everything in all-caps?? I WRITE A LOT OF SQL AND IT IS JUST HABIT AT THIS POINT.
*/

/*
  Everything in the game is a GAMEOBJECT.
*/
class GAMEOBJECT {
  CONTENTS;
  LINKS;
  LOCATION;
  NAME;
  NOUNS;
  RELATIVE_LOCATION; // Describes where this object is relative it's LOCATION - IN, ON, ETC.

  constructor(NAME) {
    this.LINKS = [];
    this.CONTENTS = [];
    if (NAME !== undefined) {
      this.NAME = NAME;
      this.NOUNS = NAME.split(" ");
    }
  }

  toString() {
    if (this.NAME === null || this.NAME === undefined)
      return "UNNAMED OBJECT";
    if (this.NAME instanceof Function)
      return String(this.NAME());
    return String(this.NAME);
  }
}

function NOUNS(object, additional_nouns) {
  for (var noun of additional_nouns.split(" "))
    object.NOUNS.push(noun);
}

/*
  MOVE a GAMEOBJECT into another GAMEOBJECT
*/
function MOVE(object, destination, relative_location) {

  // First remove from current location.
  if (object.hasOwnProperty("LOCATION")
    && object.LOCATION != null
    && object.LOCATION !== undefined
    && object.LOCATION.hasOwnProperty("CONTENTS"))
    {
      object.LOCATION.CONTENTS = object.LOCATION.CONTENTS.filter(_ => object !== _);
    }
  
  // Now stick in the new location.
  destination.CONTENTS.push(object);
  object.LOCATION = destination;
  object.RELATIVE_LOCATION = relative_location;
  if (object.RELATIVE_LOCATION === undefined)
    object.RELATIVE_LOCATION = "IN";
}

/*
  Create a LINK between two GAMEOBJECTS that can be followed with the GOING action.
*/
function LINK(object, direction, destination, door) {
  object.LINKS.push({
    DIRECTION: direction,
    DESTINATION: destination,
    DOOR: door
  });
}

/*
  Look up a LINK in the specified direction.
*/
function GET_LINK(object, direction) {
  for (var link of object.LINKS) {
    if (link.DIRECTION == direction) 
      return link;
  }
  return null;
}

/*
  Retrieve an array of the contents of a GAMEOBJECT, filtered to the specified relative_location.
*/
function GET_CONTENTS(object, relative_location) {
  var r = [];
  for (var item of object.CONTENTS)
    if (item.RELATIVE_LOCATION == relative_location)
      r.push(item);
  return r;
}

/*
  Create an object that won't be listed in the room or container but can still be looked at.
  There's a rule to explicitly forbid taking these; no need for one to forbid dropping them since the player can't ever get them.
*/
function DETAIL(object, name, description) {
  var detail = new GAMEOBJECT(name);
  detail.DESCRIPTION = description;
  MOVE(detail, object, "DETAIL");
}

/*
  Define two basic actions, DESCRIBING and NAMING, that provide hooks into the output mechanism for
  customizing the way objects are displayed.
*/
PERFORM("DESCRIBING").WHEN(_ => _.DESCRIPTION !== undefined).THEN(_ => {
  EMIT(_.DESCRIPTION);
  EMIT("\n");
}).LAST(); 
  // Marking this last makes it easy for things to override it.

PERFORM("NAMING").WHEN(_ => !(_ instanceof GAMEOBJECT)).THEN(_ => EMIT(String(_)));
PERFORM("NAMING").WHEN(_ => _.NAME === null || _.NAME === undefined).THEN(_ => EMIT("UNNAMED OBJECT")).LAST();
PERFORM("NAMING").THEN(_ => EMIT(_.NAME)).LAST();

/* 
  A couple of global variables here hold some shared game state.
*/

var CURRENT_ROOM = new GAMEOBJECT("VOID");
CURRENT_ROOM.DESCRIPTION = "THIS IS THE VOID.";
var SELF = new GAMEOBJECT();

/***
 *    ██████╗  █████╗ ██████╗ ███████╗██╗███╗   ██╗ ██████╗ 
 *    ██╔══██╗██╔══██╗██╔══██╗██╔════╝██║████╗  ██║██╔════╝ 
 *    ██████╔╝███████║██████╔╝███████╗██║██╔██╗ ██║██║  ███╗
 *    ██╔═══╝ ██╔══██║██╔══██╗╚════██║██║██║╚██╗██║██║   ██║
 *    ██║     ██║  ██║██║  ██║███████║██║██║ ╚████║╚██████╔╝
 *    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
 *                                                          
 */

/* 
  It's not PARSER IF without a PARSER. JSIF implements a basic recursive descent parser. It takes only a few
  primitives to construct a parser for all the basic IF commands.
*/

class PARSECONTEXT {
  PLACE;
  WORDS;
  STATUS;

  constructor(PLACE, WORDS) {
    this.PLACE = PLACE;
    this.WORDS = WORDS;
  }

  clone() {
    var r = new PARSECONTEXT(this.PLACE, this.WORDS);
    for (var prop in this)
      r[prop] = this[prop];
    return r;
  }

  advance() {
    var r = this.clone();
    r.PLACE += 1;
    return r;
  }

  rewind() {
    var r = this.clone();
    r.PLACE -= 1;
    return r;
  }

  with_status(status) {
    var r = this.clone();
    r.STATUS = status;
    return r;
  }

  next_word() {
    return this.WORDS[this.PLACE];
  }

  at_end() {
    return this.PLACE == this.WORDS.length;
  }

  toString() {
    var r = "{";
    for (var x = 0; x < this.WORDS.length; ++x) {
      if (this.PLACE == x)
        r += "[" + this.WORDS[x] + "] ";
      else
        r += this.WORDS[x] + " ";
    }
    r += ", " + String(this.STATUS) + "}";
    return r;
  }
}

var parse_success = { SUCCESS: true, AMBIG: false };
var parse_failure = { SUCCESS: false, AMBIG: false };
var parse_ambigious = { SUCCESS: false, AMBIG: true };

class PARSER {
  PARSE_FUNCTION;
  DESCRIPTION;

  constructor(PARSE_FUNCTION, DESCRIPTION) {
    this.PARSE_FUNCTION = PARSE_FUNCTION;
    this.DESCRIPTION = DESCRIPTION;
  }
}

function KEYWORD(word) {
  return new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE KEYWORD: " + word + " - " + String(context) + "\n", null, {EXPAND: false});
      if (context.next_word() == word) {
        return context.advance().with_status(parse_success);
      }
      else
        return context.with_status(parse_failure);
    },
    word);
}

function REST(into) {
  return new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE STRING: " + into + " - " + String(context) + "\n", null, {EXPAND: false});
      var text = "";
      while (!context.at_end()) {
        text += " " + context.next_word();
        context = context.advance();
      }
      var r = context.with_status(parse_success);
      r[into] = text.trim();
      return r;
    },
  "[REST -> " + into + "]");
}

function ALTERNATIVE(...parts) {
  var r = new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE ALTERNATIVE: " + r.DESCRIPTION + " - " + String(context) + "\n", null, {EXPAND: false});

      for (var part of parts) {
        var result = part.PARSE_FUNCTION(context);
        if (result.STATUS.SUCCESS)
          return result;
      }
      return context.with_status(parse_failure);
    }, "");

  r.DESCRIPTION = "(";
  if (parts.length > 0)
    r.DESCRIPTION += parts[0].DESCRIPTION;
  for (var x = 1; x < parts.length; ++x)
    r.DESCRIPTION += " | " + parts[x].DESCRIPTION;
  r.DESCRIPTION += ")";
  return r;
}

function SEQUENCE(...parts) {
  var r = new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE SEQUENCE: " + r.DESCRIPTION + " - " + String(context) + "\n", null, {EXPAND: false});

      for (var part of parts) {
        context = part.PARSE_FUNCTION(context);
        if (context.STATUS.SUCCESS == false)
          return context;
      }
      return context;
    }, "");

  if (parts.length > 0)
    r.DESCRIPTION += parts[0].DESCRIPTION;
  for (var x = 1; x < parts.length; ++x)
    r.DESCRIPTION += " " + parts[x].DESCRIPTION;
  return r;
}

function find_visible_scope(search_object, into) {
  for (var item of search_object.CONTENTS) {
    if (search_object.LOCATION === undefined) {
      // This is a top-level object; either the player or a room. So skip the container check.
      into.push(item);
      find_visible_scope(item, into);
    }
    else {
      if (item.RELATIVE_LOCATION == "ON") {
        into.push(item);
        find_visible_scope(item, into);
      }

      if (item.RELATIVE_LOCATION == "IN" && search_object.CONTAINER == true && search_object.OPEN != false) {
        into.push(item);
        find_visible_scope(item, into);
      }

      if (item.RELATIVE_LOCATION == "DETAIL") {
        into.push(item);
      }
    }
  }

  for (var link of search_object.LINKS)
    if (link.DOOR)
      into.push(link.DOOR);
}

/*
  The most complex of parsers, and the most important! It matches all the things in scope.
*/
function THING(field) {
  return new PARSER(
    (context) => {
      if (PARSE_TRACE) 
        EMIT("PARSE OBJECT: " + field + " - " + String(context) + "\n", null, {EXPAND: false});

      // This should be an actual recursive search to find all visible objects.
      var possible_set = [];
      find_visible_scope(CURRENT_ROOM, possible_set);
      find_visible_scope(SELF, possible_set);
      
      while(true) {

        if (PARSE_TRACE)
          EMIT("*  C: " + String(context) + " POSSIBLE SET: " + String(possible_set) + "\n", null, {EXPAND: false});
        
        if (context.at_end() && possible_set.length > 1) {
          if (PARSE_TRACE)
            EMIT("*  OH NO, AMBIG!\n", null, {EXPAND: false});
          return context.with_status(parse_ambigious);
        }

        if (context.at_end() && possible_set.length == 1) {
          if (PARSE_TRACE)
            EMIT("*  RAN OUT, BUT IT'S FINE!\n", null, {EXPAND: false});
          var r = context.with_status(parse_success);
          r[field] = possible_set[0];
          return r;
        }

        var word = context.next_word();
        var next_set = [];

        for (var object of possible_set)
          if (object.NOUNS.includes(word))
            next_set.push(object);

        if (next_set.length == 0 && possible_set.length == 1) {
          if (PARSE_TRACE)
            EMIT("*  NEXT WORD DIDN'T MATCH, BUT IT'S FINE!\n", null, {EXPAND: false});
          var r = context.with_status(parse_success);
          r[field] = possible_set[0];
          return r;
        }

        possible_set = next_set;

        if (possible_set.length == 0) {
          if (PARSE_TRACE)
            EMIT("*  NOTHING MATCHED??\n", null, {EXPAND: false});
          return context.with_status(parse_failure);
        }

        context = context.advance();
      }
    },
    "[OBJECT -> " + field + "]");
}

var __directions = [
  { ID: "FORE",      MAPPED: "FORE" },
  { ID: "AFT",       MAPPED: "AFT" },
  { ID: "STARBOARD", MAPPED: "STARBOARD" },
  { ID: "PORT",      MAPPED: "PORT" },
  { ID: "UP",        MAPPED: "UP" },
  { ID: "DOWN",      MAPPED: "DOWN" },
  { ID: "F",         MAPPED: "FORE" },
  { ID: "A",         MAPPED: "AFT" },
  { ID: "S",         MAPPED: "STARBOARD" },
  { ID: "P",         MAPPED: "PORT" },
  { ID: "U",         MAPPED: "UP" },
  { ID: "D",         MAPPED: "DOWN" },
  { ID: "NORTH",     MAPPED: "NORTH" },
  { ID: "EAST",      MAPPED: "EAST" },
  { ID: "SOUTH",     MAPPED: "SOUTH" },
  { ID: "WEST",      MAPPED: "WEST" },
  { ID: "N",         MAPPED: "NORTH" },
  { ID: "E",         MAPPED: "EAST" },
  { ID: "W",         MAPPED: "WEST" }  
];

function DIRECTION(field) {
  return new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE DIRECTION: " + field + " - " + String(context) + "\n", null, {EXPAND: false});

      if (context.at_end())
        return context.with_status(parse_failure);

      for (var possibility of __directions) {
        if (context.next_word() == possibility.ID) {
          var r = context.advance().with_status(parse_success);
          r[field] = possibility.MAPPED;
          return r;
        }
      }

      return context.with_status(parse_failure);
    },
    "[DIRECTION -> " + field + "]");
}

var __rellocs = [
  { ID: "ON", MAPPED: "ON" },
  { ID: "IN", MAPPED: "IN" }
];

function RELLOC(field) {
  return new PARSER(
    (context) => {
      if (PARSE_TRACE)
        EMIT("PARSE RELLOC: " + field + " - " + String(context) + "\n");

      if (context.at_end())
        return context.with_status(parse_failure);

      for (var possibility of __rellocs) {
        if (context.next_word() == possibility.ID) {
          var r = context.advance().with_status(parse_success);
          r[field] = possibility.MAPPED;
          return r;
        }
      }

      return context.with_status(parse_failure);
    },
    "[RELLOC -> " + field + "]");
}

/***
 *     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗     ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗██╗███╗   ██╗ ██████╗ 
 *    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝██║████╗  ██║██╔════╝ 
 *    ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║    ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗██║██╔██╗ ██║██║  ███╗
 *    ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║██║██║╚██╗██║██║   ██║
 *    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝    ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║██║██║ ╚████║╚██████╔╝
 *     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
 *                                                                                                                                                        
 */

/*
  We have a WORLD, we have a PARSER, we have RULES. Now we need to tie that all together: 
    PARSE the player's command and execute the correct RULEBOOK.
*/

var COMMANDS = [];
var MANPAGES = [];

var PARSE_TRACE = false;
var RULES_TRACE = false;

class COMMAND {
  PARSER;
  UNDERSTAND;
  FILTER;

  constructor(PARSER, UNDERSTAND) {
    this.PARSER = PARSER;
    this.UNDERSTAND = UNDERSTAND;
  }

  WHEN(FILTER) {
    this.FILTER = FILTER;
    return this;
  }
}

function UNDERSTAND(understand_as, parser) {
  var _command = new COMMAND(parser, understand_as);
  COMMANDS.push(_command);
  return _command;
}

class _MANPAGE {
  TOPIC;
  HELP;

  constructor(TOPIC, HELP) {
    this.TOPIC = TOPIC;
    this.HELP = HELP;
  }
}

function MANPAGE(action, help) {
  var page = new _MANPAGE(action, help);
  MANPAGES.push(page);
}

function FOLLOW_COMMAND(command) {
  console.log(command);
  PARSE_TRACE = false;
  RULES_TRACE = false;

  var rawWords = command.split(" ");
  var words = [];
  for(var word of rawWords) 
    if (word != '') words.push(word);

  if (words.length == 0) {
    EMIT("You didn't type anything.\n");
    return;
  }

  if (words[0].charAt(0) == '@') {
    console.log("ACTIVATING PARSER TRACE.\n");
    words[0] = words[0].substring(1);
    if (words[0] == "") {
      EMIT("Uh?");
      return;
    }
    PARSE_TRACE = true;
  }

  if (words[0].charAt(0) == '!') {
    console.log("ACTIVATING RULES TRACE.\n");
    words[0] = words[0].substring(1);
    if (words[0] == "") {
      EMIT("Uh?");
      return;
    }
    RULES_TRACE = true;
  }

  var context = new PARSECONTEXT(0, words);
  var first_partial_command = null;
  for (var command of COMMANDS) {
    if (PARSE_TRACE) console.log("###\nTRYING ACTION " + command.UNDERSTAND + "\n");
    var parse_results = command.PARSER.PARSE_FUNCTION(context);
    if (parse_results.STATUS.SUCCESS) {
      if (parse_results.at_end()) {
        if (command.FILTER !== undefined && command.FILTER(parse_results) == false)
          continue;
        console.log("Understood as " + command.UNDERSTAND);
        return FOLLOW_PARSED_COMMAND(command.UNDERSTAND, parse_results);
      }
      else {
        if (first_partial_command == null)
          first_partial_command = command;
      }
    }
    else if (parse_results.STATUS.AMBIG) {
      EMIT("I UNDERSTOOD PART OF THAT AS THE " + command.UNDERSTAND + " action, but wasn't sure which object you were referring to.");
      return false;
    }
  }
  if (first_partial_command != null)
    EMIT("I understood part of that as the " + first_partial_command.UNDERSTAND + " action.\n");
  else
    EMIT("I did not understand that.\n");
  return true;
}

function FOLLOW_PARSED_COMMAND(command, parse_results) {
  parse_results.COMMAND_FAILED = false;
  CONSIDER(command, parse_results);
  return parse_results.COMMAND_FAILED;
}

/***
 *     ██████╗ ██████╗ ██████╗ ███████╗     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ███████╗
 *    ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝
 *    ██║     ██║   ██║██████╔╝█████╗      ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║███████╗
 *    ██║     ██║   ██║██╔══██╗██╔══╝      ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║╚════██║
 *    ╚██████╗╚██████╔╝██║  ██║███████╗    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝███████║
 *     ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝
 *                                                                                                                  
 */

UNDERSTAND("TESTING", KEYWORD("TEST"));
PERFORM("TESTING").THEN("TESTING!\n");

UNDERSTAND("HELP", KEYWORD("HELP"));
PERFORM("HELP").THEN(_ => {
  EMIT("HERE IS A LIST OF EVERY ACTION I CAN PERFORM:\n");
  var commandNames = [];
  for (var command of COMMANDS)
    commandNames.push(command.UNDERSTAND);
  let uniqueItems = [...new Set(commandNames)]
  for (var command of uniqueItems)
    EMIT(command + "\n");
  EMIT("TRY 'HELP [ACTION]' FOR HELP ABOUT A SPECIFIC ACTION\n");
});

UNDERSTAND("HELP WITH", SEQUENCE(KEYWORD("HELP"), REST("TOPIC")));
PERFORM("HELP WITH").THEN(_ => {
  EMIT("HERE IS EVERYTHING I KNOW ABOUT THE TOPIC " + _.TOPIC + "\n", null, {EXPAND: false});
  var relevantCommands = [];
  for (var command of COMMANDS)
    if (command.UNDERSTAND == _.TOPIC)
      relevantCommands.push(command);
  if (relevantCommands.length > 0) {
    EMIT("THERE ARE (" + relevantCommands.length + ") COMMANDS THAT I UNDERSTAND AS PERFORMING THIS ACTION.\n", null, {EXPAND: false});
    for (var command of relevantCommands)
      EMIT("*  " + command.PARSER.DESCRIPTION + "\n", null, {EXPAND: false});
  }
  for (var manpage of MANPAGES) 
    if (manpage.TOPIC == _.TOPIC)
      EMIT("\n" + manpage.HELP + "\n", null, {EXPAND: false});
});

var DEBUG_COMMAND = UNDERSTAND("DEBUGGING", SEQUENCE(KEYWORD("X"), THING("OBJECT")));
PERFORM("DEBUGGING").THEN(_ => {
  EMIT("PROPERTIES OF [{OBJECT}]\n", _, {EXPAND: false});
  for (var propertyName in _.OBJECT)
    if (_.OBJECT[propertyName] instanceof GAMEOBJECT)
      EMIT("*  " + propertyName + " : [{" + propertyName + "}]\n", _.OBJECT, {EXPAND: true})
    else
      EMIT("*  " + propertyName + " : " + String(_.OBJECT[propertyName]) + "\n", null, {EXPAND: false});
});

UNDERSTAND("DEBUGGING HERE", SEQUENCE(KEYWORD("X"), KEYWORD("HERE")));
PERFORM("DEBUGGING HERE").THEN(_ => FOLLOW_PARSED_COMMAND("DEBUGGING", { OBJECT: CURRENT_ROOM }));

UNDERSTAND("DEBUGGING ME", SEQUENCE(KEYWORD("X"), KEYWORD("ME")));
PERFORM("DEBUGGING ME").THEN(_ => FOLLOW_PARSED_COMMAND("DEBUGGING", { OBJECT: SELF }));

UNDERSTAND("RULES", SEQUENCE(KEYWORD("RULES"), REST("RULEBOOK")));
PERFORM("RULES").THEN(_ => {
  EMIT("RULEBOOK NAMED " + _.RULEBOOK + "\n", null, {EXPAND: false});
  if (GLOBAL_RULES[_.RULEBOOK] === undefined) 
    EMIT("UNDEFINED\n", null, {EXPAND: false});
  else {
    for (var rule of GLOBAL_RULES[_.RULEBOOK].INSTEAD_RULES)
      EMIT("INSTEAD WHEN [" + String(rule._WHEN) + "] THEN [" + String(rule._THEN) + "]\n", null, {EXPAND: false});
    for (var rule of GLOBAL_RULES[_.RULEBOOK].PERFORM_RULES)
      EMIT("PERFORM WHEN [" + String(rule._WHEN) + "] THEN [" + String(rule._THEN) + "]\n", null, {EXPAND: false});
  }
});

UNDERSTAND("RULEBOOKS", KEYWORD("RULEBOOKS"));
PERFORM("RULEBOOKS").THEN(_ => {
  EMIT("ALL RULEBOOKS:\n", null, {EXPAND: false});
  for (var rulebookName in GLOBAL_RULES)
    EMIT(rulebookName + "\n", null, {EXPAND: false});
});

UNDERSTAND("LOOKING HERE", KEYWORD("LOOK"));
UNDERSTAND("LOOKING HERE", SEQUENCE(KEYWORD("LOOK"), KEYWORD("HERE")));
UNDERSTAND("LOOKING HERE", KEYWORD("L"));
UNDERSTAND("LOOKING HERE", SEQUENCE(KEYWORD("L"), KEYWORD("HERE")));

PERFORM("LOOKING HERE").THEN(_ => {
  EMIT("## SCANNING LOCATION.....\n");
  CONSIDER("DESCRIBING", CURRENT_ROOM);
  EMIT("\n");
  if (CURRENT_ROOM.CONTENTS.length > 0) {
    EMIT("STUFF HERE:\n");
    for(var item of CURRENT_ROOM.CONTENTS) {
      EMIT("*  {ITEM}\n", {ITEM: item});
    }
  }

  if (CURRENT_ROOM.LINKS.length > 0) {
    EMIT("I CAN GO:\n");
    for(var link of CURRENT_ROOM.LINKS) {
      if (link.DOOR) 
        EMIT("*  " + link.DIRECTION + " [THROUGH {DOOR}]\n", link);
      else
        EMIT("*  " + link.DIRECTION + "\n");
    }
  }
});

UNDERSTAND("LOOKING AT", SEQUENCE(KEYWORD("LOOK"), KEYWORD("AT"), THING("OBJECT")));
UNDERSTAND("LOOKING AT", SEQUENCE(KEYWORD("L"), KEYWORD("AT"), THING("OBJECT")));
UNDERSTAND("LOOKING AT", SEQUENCE(KEYWORD("LOOK"), THING("OBJECT")));
UNDERSTAND("LOOKING AT", SEQUENCE(KEYWORD("L"), THING("OBJECT")));

PERFORM("LOOKING AT").THEN(_ => {
  EMIT("## SCANNING [{OBJECT}]\n", _);
  CONSIDER("DESCRIBING", _.OBJECT);
  EMIT("\n");

  var items_on = GET_CONTENTS(_.OBJECT, "ON");
  if (items_on.length > 0) {
    EMIT("ON IT IS:\n");
    for (var item of items_on)
      EMIT("*  {ITEM}\n", {ITEM: item});
  }

  if (_.OBJECT.CONTAINER == true) {
    if (_.OBJECT.OPEN != false) {
      var items_inside = GET_CONTENTS(_.OBJECT, "IN");
      if (items_inside.length > 0) {
        EMIT("IT IS OPEN. INSIDE:\n");
        for(var item of items_inside) {
          EMIT("*  {ITEM}\n", {ITEM: item});
        }
      }
      else
        EMIT("IT IS OPEN, AND ALSO EMPTY.\n");
    }
    else
      EMIT("IT IS CLOSED.\n");
  }
});

var LOOK_INSIDE = UNDERSTAND("LOOKING IN", SEQUENCE(KEYWORD("LOOK"), KEYWORD("IN"), THING("OBJECT")));

INSTEAD("LOOKING IN").WHEN(_ => _.OBJECT.CONTAINER != true).THEN(_ => EMIT("The concept of \"in\" doesn't seem to apply to that\n"));
INSTEAD("LOOKING IN").WHEN(_ => _.OBJECT.OPEN == false).THEN(_ => EMIT("It's closed\n"));
PERFORM("LOOKING IN").THEN(_ => {
  EMIT("INSIDE [{OBJECT}] IS:\n", _);
  var items = GET_CONTENTS(_.OBJECT, "IN");
  if (items.length == 0)
    EMIT("...NOTHING!\n");
  else
    for(var item of items) {
      EMIT("*  {ITEM}\n", {ITEM: item});
  }
});

UNDERSTAND("LISTING INVENTORY", ALTERNATIVE(KEYWORD("I"), KEYWORD("INV"), KEYWORD("INVENTORY")));
UNDERSTAND("LISTING INVENTORY", SEQUENCE(KEYWORD("LOOK"), KEYWORD("ME")));
UNDERSTAND("LISTING INVENTORY", SEQUENCE(KEYWORD("L"), KEYWORD("ME")));

PERFORM("LISTING INVENTORY").THEN(_ => {
  CONSIDER("DESCRIBING", SELF);
  EMIT("\n");
  if (SELF.hasOwnProperty("CONTENTS")) {
    EMIT("I got:\n");
    if (SELF.CONTENTS.length == 0)
      EMIT("...NOTHING!\n");
    else
      for(var item of SELF.CONTENTS) {
        EMIT("*  {ITEM}\n", {ITEM: item});
    }
  }
});

UNDERSTAND("PUSHING", SEQUENCE(KEYWORD("PUSH"), THING("OBJECT")));
UNDERSTAND("PUSHING", SEQUENCE(KEYWORD("MOVE"), THING("OBJECT")));
INSTEAD("PUSHING").THEN(_ => EMIT("Doesn't seem to do anything\n"));

UNDERSTAND("TAKING", SEQUENCE(KEYWORD("GET"), THING("OBJECT")));
UNDERSTAND("TAKING", SEQUENCE(KEYWORD("TAKE"), THING("OBJECT")));

INSTEAD("TAKING").WHEN(_ => _.OBJECT.FIXED == true).THEN(_ => { EMIT("That is firmly attached, I couldn't possibly take it.\n"); });
INSTEAD("TAKING").WHEN(_ => _.OBJECT.LOCATION === SELF).THEN(_ => EMIT("I ALREADY HAVE THAT.\n"));
INSTEAD("TAKING").WHEN(_ => _.OBJECT.RELATIVE_LOCATION == "DETAIL").THEN("IF THAT WAS SOMETHING I COULD TAKE I WOULD HAVE LISTED IT OUT FOR YOU.");

PERFORM("TAKING").THEN(_ => {
  EMIT("Taking the {OBJECT}\n", _);
  MOVE(_.OBJECT, SELF);
});

UNDERSTAND("DROPPING", SEQUENCE(KEYWORD("DROP"), THING("OBJECT")));
UNDERSTAND("DROPPING", SEQUENCE(KEYWORD("DISCARD"), THING("OBJECT")));

INSTEAD("DROPPING").WHEN(_ => _.OBJECT.LOCATION !== SELF).THEN(_ => EMIT("I'm not holding that.\n"));
PERFORM("DROPPING").THEN(_ => {
  EMIT("DROPPING THE {OBJECT}\n", _);
  MOVE(_.OBJECT, CURRENT_ROOM);
});

UNDERSTAND("PUTTING", SEQUENCE(KEYWORD("PUT"), THING("OBJECT"), RELLOC("RELATIVE_LOCATION"), THING("LOCATION")));
INSTEAD("PUTTING").WHEN(_ => _.OBJECT.LOCATION !== SELF).THEN(_ => EMIT("I'm not holding that.\n"));
INSTEAD("PUTTING").WHEN(_ => _.RELATIVE_LOCATION == "IN" && _.LOCATION.CONTAINER != true).THEN("I CAN'T PUT THINGS INSIDE THAT\n");
INSTEAD("PUTTING").WHEN(_ => _.RELATIVE_LOCATION == "IN" && _.LOCATION.OPEN == false).THEN("I WOULD HAVE TO OPEN IT FIRST\n");
INSTEAD("PUTTING").WHEN(_ => _.RELATIVE_LOCATION == "ON" && _.LOCATION.SUPPORTER != true).THEN("I CAN'T PUT THINGS ON THAT\n");
PERFORM("PUTTING").THEN(_ => {
  EMIT("PUTTING THE {OBJECT} {RELATIVE_LOCATION} THE {LOCATION}\n", _);
  MOVE(_.OBJECT, _.LOCATION, _.RELATIVE_LOCATION);
});

var UNLOCK_COMMAND = UNDERSTAND("UNLOCKING", SEQUENCE(KEYWORD("UNLOCK"), THING("OBJECT")));

INSTEAD("UNLOCKING").WHEN(_ => _.OBJECT.LOCKED === undefined).THEN(_ => EMIT("That isn't something that can be locked in the first place.\n"));
INSTEAD("UNLOCKING").WHEN(_ => _.OBJECT.LOCKED === false).THEN(_ => EMIT("It's already unlocked.\n"));
PERFORM("UNLOCKING").THEN(_ => {
  EMIT("UNLOCKING [{OBJECT}]\n", _);
  _.OBJECT.LOCKED = false;
});

var COMMAND_OPEN = UNDERSTAND("OPENING", SEQUENCE(KEYWORD("OPEN"), THING("OBJECT")));

INSTEAD("OPENING").WHEN(_ => _.OBJECT.OPEN === undefined).THEN(_ => {
  EMIT("You can't open that.\n");
  _.COMMAND_FAILED = true;
});

PERFORM("OPENING").WHEN(_ => _.OBJECT.LOCKED == true).THEN(_ => {
  EMIT("[FIRST UNLOCKING THE {OBJECT}]\n", _);
  var unlock_failed = FOLLOW_PARSED_COMMAND("UNLOCKING", _);
  if (unlock_failed)
    return RULE_RESULT.ABORT;
});

PERFORM("OPENING").THEN(_ => {
  EMIT("OPENING THE {OBJECT}\n", _);
  _.OBJECT.OPEN = true;
  if (_.OBJECT.CONTAINER == true)
    FOLLOW_PARSED_COMMAND("LOOKING IN", _);
})

var CLOSE_COMMAND = UNDERSTAND("CLOSING", SEQUENCE(KEYWORD("CLOSE"), THING("OBJECT")));

INSTEAD("CLOSING").WHEN(_ => _.OBJECT.OPEN === undefined).THEN(_ => {
  EMIT("That isn't something that can be open or closed\n");
  _.COMMAND_FAILED = true;
});

INSTEAD("CLOSING").WHEN(_ => _.OBJECT.OPEN == false).THEN(_ => EMIT("IT'S ALREADY CLOSED"));

PERFORM("CLOSING").THEN(_ => {
  EMIT("CLOSING THE {OBJECT}\n", _);
  _.OBJECT.OPEN = false;
})


UNDERSTAND("GOING", SEQUENCE(KEYWORD("GO"), DIRECTION("DIRECTION")));
UNDERSTAND("GOING", DIRECTION("DIRECTION"));

INSTEAD("GOING").WHEN(_ => GET_LINK(CURRENT_ROOM, _.DIRECTION) == null).THEN("I can't go that way.\n");

PERFORM("GOING").WHEN(_ => {
  if (GET_LINK(CURRENT_ROOM, _.DIRECTION).DOOR == null) return false;
  if (GET_LINK(CURRENT_ROOM, _.DIRECTION).DOOR.OPEN == true) return false;
  return true;
}).THEN(_ => { 
    EMIT("[First opening the {DOOR}]\n", GET_LINK(CURRENT_ROOM, _.DIRECTION));
    var fake_parse = { OBJECT: GET_LINK(CURRENT_ROOM, _.DIRECTION).DOOR };
    var open_failed = FOLLOW_PARSED_COMMAND("OPENING", fake_parse);
    if (open_failed)
      return RULE_RESULT.ABORT;
  });

PERFORM("GOING").THEN(_ => {
  EMIT("Going " + _.DIRECTION + "\n");
  CURRENT_ROOM = GET_LINK(CURRENT_ROOM, _.DIRECTION).DESTINATION;
  FOLLOW_COMMAND("LOOK");
});

UNDERSTAND("USING", SEQUENCE(KEYWORD("USE"), THING("OBJECT")));
INSTEAD("USING").THEN("I DON'T KNOW HOW TO DO THAT.\n").LAST();

UNDERSTAND("USING ON", SEQUENCE(KEYWORD("USE"), THING("TOOL"), KEYWORD("ON"), THING("OBJECT")));
UNDERSTAND("USING ON", SEQUENCE(KEYWORD("USE"), THING("TOOL"), KEYWORD("WITH"), THING("OBJECT")));

INSTEAD("USING ON").THEN(_ => EMIT("I don't know how to do that.\n")).LAST();

/*
  TODO:
*/
