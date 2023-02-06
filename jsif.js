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
  A RULEBOOK is really just a piece of code that gets run under a specific condition.
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

class Rule {
  WHEN;
  EXEC;
  ORDER;

  constructor(when_clause, exec_clause) {
    this.WHEN = when_clause;
    this.EXEC = exec_clause;
    this.ORDER = 1;
  }

  last() {
    this.ORDER = 2;
  }

  first() {
    this.ORDER = 0;
  }

  toString() {
    return "WHEN [" + String(this.WHEN) + "] THEN [" + String(this.EXEC) + "]";
  }
}

var GLOBAL_RULES = {};

/* This must be called after all the custom rulebooks for the game are declared, to put them in the proper order. */
function prepare_rules() {
  for (var rulebookName in GLOBAL_RULES) {
    if (GLOBAL_RULES[rulebookName] instanceof RULEBOOK) {
      GLOBAL_RULES[rulebookName].INSTEAD_RULES.sort((a, b) => a.ORDER - b.ORDER);
      GLOBAL_RULES[rulebookName].PERFORM_RULES.sort((a, b) => a.ORDER - b.ORDER);
    }
  }
}

const RULE_RESULT = {
	CONTINUE: Symbol("RULE_RESULT_CONTINUE"),
  ABORT: Symbol("RULE_RESULT_ABORT")
};

function perform(rulebook_name, when_clause, exec_clause) {
  if (typeof exec_clause == "string") {
    var inner_text = exec_clause;
    exec_clause = _ => emit(inner_text);
  }

  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name))
    GLOBAL_RULES[rulebook_name] = new Rulebook(rulebook_name);
  var r = new Rule(when_clause, exec_clause);
  GLOBAL_RULES[rulebook_name].PERFORM_RULES.push(r);
  return r;
}

function instead(rulebook_name, when_clause, exec_clause) {
  if (typeof exec_clause == "string") {
    var inner_text = exec_clause;
    exec_clause = _ => emit(inner_text);
  }
  
  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name))
    GLOBAL_RULES[rulebook_name] = new Rulebook(rulebook_name);
  var r = new Rule(when_clause, exec_clause);
  GLOBAL_RULES[rulebook_name].INSTEAD_RULES.push(r);
  return r;
}

function consider(rulebook_name, arguments) {
  if (RULES_TRACE) {
    console.log("! CONSIDERING RULEBOOK " + rulebook_name);
    console.log(arguments);
  }

  if (!GLOBAL_RULES.hasOwnProperty(rulebook_name)) {
    if (RULES_TRACE)
      console.log("! NO SUCH RULEBOOK.");
    return;
  }

  var matched_instead_rule = false;
  for (var rule of GLOBAL_RULES[rulebook_name].INSTEAD_RULES) {
    if (RULES_TRACE)
      console.log("! CHECKING INSTEAD " + rulebook_name + " " + String(rule));
    if (rule.WHEN(arguments)) {
      if (RULES_TRACE) 
        console.log("! MATCHED, EXECUTING.");
      rule.EXEC(arguments); // Result type of instead rules does not matter; they always abort. BUT - they need a way to report 'failure' or 'success'.
      if (RULES_TRACE)
        console.log("! DONE CONSIDERING.");
      return;
    }
    else {
      if (RULES_TRACE)
        console.log("! DIDN'T MATCH");
    }
  }

  for (var rule of GLOBAL_RULES[rulebook_name].PERFORM_RULES) {
    if (RULES_TRACE) 
      console.log("! CHECKING PERFORM " + rulebook_name + " " + String(rule));

    if (rule.WHEN(arguments)) {
      if (RULES_TRACE) 
        console.log("! MATCHED, EXECUTING.");
      var rule_result = rule.EXEC(arguments);
      if (rule_result == RULE_RESULT.ABORT) {
        if (RULES_TRACE)
          console.log("! RULE ABORTED CONSIDERATION, DONE CONSIDERING.");
        return;
      }      
    }
    else {
      if (RULES_TRACE)
        console.log("! DIDN'T MATCH");
    }
  }

  if (RULES_TRACE)
    console.log("! DONE CONSIDERING.");
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

class GameObject {
  ID = -1;
  CONTENTS;
  LINKS;
  LOCATION;
  NAME;
  NOUNS;
  RELATIVE_LOCATION;

  constructor(NAME) {
    this.LINKS = [];
    this.CONTENTS = [];
    if (NAME !== undefined) {
      this.NAME = NAME;
      this.NOUNS = NAME.split(" ");
    }
  }

  get_link(direction) {
    for (var link of this.LINKS) {
      if (link.DIRECTION == direction) 
        return link;
    }
    return null;
  }

  toString() {
    if (this.NAME === null || this.NAME === undefined)
      return String(this.ID);
    if (this.NAME instanceof Function)
      return String(this.NAME());
    return String(this.NAME);
  }
}

var current_id = 0;

function allocate_object(NAME) {
  var r = new GameObject(NAME);
  r.ID = current_id;
  current_id += 1;
  return r;
}

function object_equals(a, b) {
  return a.ID == b.ID;
}

function move_object(object, destination, relative_location) {

  if (object.hasOwnProperty("LOCATION")
    && object.LOCATION != null
    && object.LOCATION !== undefined
    && object.LOCATION.hasOwnProperty("CONTENTS"))
    {
      object.LOCATION.CONTENTS = object.LOCATION.CONTENTS.filter(_ => object !== _);
    }

  if (!destination.hasOwnProperty("CONTENTS"))
    destination.CONTENTS = [];

  destination.CONTENTS.push(object);
  object.LOCATION = destination;
  object.RELATIVE_LOCATION = relative_location;
  if (object.RELATIVE_LOCATION === undefined)
    object.RELATIVE_LOCATION = "IN";
}

function link(object, direction, destination, door) {
  object.LINKS.push({
    DIRECTION: direction,
    DESTINATION: destination,
    DOOR: door
  });
}

function get_contents(object, relative_location) {
  var r = [];
  for (var item of object.CONTENTS)
    if (item.RELATIVE_LOCATION == relative_location)
      r.push(item);
  return r;
}

perform("DESCRIBING", _ => _.DESCRIPTION !== undefined, _ => emit(_.DESCRIPTION));
perform("NAMING", _ => !(_ instanceof GameObject), _ => emit(String(_)));
perform("NAMING", _ => _.NAME === null || _.NAME === undefined, _ => emit(_.ID));
perform("NAMING", _ => true, _ => emit(_.NAME));

/***
 *    ██████╗  █████╗ ██████╗ ███████╗██╗███╗   ██╗ ██████╗ 
 *    ██╔══██╗██╔══██╗██╔══██╗██╔════╝██║████╗  ██║██╔════╝ 
 *    ██████╔╝███████║██████╔╝███████╗██║██╔██╗ ██║██║  ███╗
 *    ██╔═══╝ ██╔══██║██╔══██╗╚════██║██║██║╚██╗██║██║   ██║
 *    ██║     ██║  ██║██║  ██║███████║██║██║ ╚████║╚██████╔╝
 *    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
 *                                                          
 */

class parse_context {
  PLACE;
  WORDS;
  STATUS;

  constructor(PLACE, WORDS) {
    this.PLACE = PLACE;
    this.WORDS = WORDS;
  }

  clone() {
    var r = new parse_context(this.PLACE, this.WORDS);
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

var parse_success = { SUCCESS: true };
var parse_failure = { SUCCESS: false };
var parse_ambigious = { SUCCESS: false };

class Parser {
  PARSE_FUNCTION;
  DESCRIPTION;

  constructor(PARSE_FUNCTION, DESCRIPTION) {
    this.PARSE_FUNCTION = PARSE_FUNCTION;
    this.DESCRIPTION = DESCRIPTION;
  }
}

// These need to be objects so that the HELP command can output the tree.
function parse_keyword(word) {
  return new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE KEYWORD: " + word + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});
      if (context.next_word() == word) {
        return context.advance().with_status(parse_success);
      }
      else
        return context.with_status(parse_failure);
    },
    word);
}

function parse_string(into) {
  return new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE STRING: " + into + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});
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

function parse_alternative(...parts) {
  var r = new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE ALTERNATIVE: " + r.DESCRIPTION + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});

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

function parse_sequence(...parts) {
  var r = new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE SEQUENCE: " + r.DESCRIPTION + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});

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
    }
  }

  for (var link of search_object.LINKS)
    if (link.DOOR)
      into.push(link.DOOR);
}

function parse_object(field) {
  return new Parser(
    (context) => {
      if (PARSE_TRACE) 
        emit("PARSE OBJECT: " + field + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});

      // This should be an actual recursive search to find all visible objects.
      var possible_set = [];
      find_visible_scope(CURRENT_ROOM, possible_set);
      find_visible_scope(SELF, possible_set);
      
      while(true) {

        if (PARSE_TRACE)
          emit("*  C: " + String(context) + " POSSIBLE SET: " + String(possible_set) + "\n", null, {EXPAND: false, INSTANT: true});
        
        if (context.at_end() && possible_set.length > 1) {
          if (PARSE_TRACE)
            emit("*  OH NO, AMBIG!\n", null, {EXPAND: false, INSTANT: true});
          return context.with_status(parse_ambigious);
        }

        if (context.at_end() && possible_set.length == 1) {
          if (PARSE_TRACE)
            emit("*  RAN OUT, BUT IT'S FINE!\n", null, {EXPAND: false, INSTANT: true});
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
            emit("*  NEXT WORD DIDN'T MATCH, BUT IT'S FINE!\n", null, {EXPAND: false, INSTANT: true});
          var r = context.with_status(parse_success);
          r[field] = possible_set[0];
          return r;
        }

        possible_set = next_set;

        if (possible_set.length == 0) {
          if (PARSE_TRACE)
            emit("*  NOTHING MATCHED??\n", null, {EXPAND: false, INSTANT: true});
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
  { ID: "D",         MAPPED: "DOWN" }
];

function parse_direction(field) {
  return new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE DIRECTION: " + field + " - " + String(context) + "\n", null, {EXPAND: false, INSTANT: true});

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

function parse_relloc(field) {
  return new Parser(
    (context) => {
      if (PARSE_TRACE)
        emit("PARSE RELLOC: " + field + " - " + String(context) + "\n");

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

  when(FILTER) {
    this.FILTER = FILTER;
    return this;
  }
}

function understand(understand_as, parser) {
  var _command = new COMMAND(parser, understand_as);
  COMMANDS.push(_command);
  return _command;
}

class MANPAGE {
  TOPIC;
  HELP;

  constructor(TOPIC, HELP) {
    this.TOPIC = TOPIC;
    this.HELP = HELP;
  }
}

function manpage(action, help) {
  var page = new MANPAGE(action, help);
  MANPAGES.push(page);
}

function follow_command(command) {
  console.log(command);
  PARSE_TRACE = false;
  RULES_TRACE = false;

  var rawWords = command.split(" ");
  var words = [];
  for(var word of rawWords) 
    if (word != '') words.push(word);

  if (words.length == 0) {
    emit("You didn't type anything.\n");
    return;
  }

  if (words[0].charAt(0) == '@') {
    emit("ACTIVATING PARSER TRACE.\n");
    words[0] = words[0].substring(1);
    if (words[0] == "") {
      emit("Uh?");
      return;
    }
    PARSE_TRACE = true;
  }

  if (words[0].charAt(0) == '!') {
    emit("ACTIVATING RULES TRACE.\n");
    words[0] = words[0].substring(1);
    if (words[0] == "") {
      emit("Uh?");
      return;
    }
    RULES_TRACE = true;
  }

  var context = new parse_context(0, words);
  var first_partial_command = null;
  for (var command of COMMANDS) {
    if (PARSE_TRACE)
      emit("###\nTRYING ACTION " + command.UNDERSTAND + "\n", null, {EXPAND: false, INSTANT: true});
    var parse_results = command.PARSER.PARSE_FUNCTION(context);
    if (parse_results.STATUS.SUCCESS) {
      if (parse_results.at_end()) {
        if (command.FILTER !== undefined && command.FILTER(parse_results) == false)
          continue;
        console.log("Understood as " + command.UNDERSTAND);
        return follow_parsed_command(command, parse_results);
      }
      else {
        if (first_partial_command == null)
          first_partial_command = command;
      }
    }
  }
  if (first_partial_command != null)
    emit("I understood part of that as the " + first_partial_command.UNDERSTAND + " action.\n");
  else
    emit("I did not understand that.\n");
  return true;
}

function follow_parsed_command(command, parse_results) {
  parse_results.COMMAND_FAILED = false;
  consider(command.UNDERSTAND, parse_results);
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

understand("TESTING", parse_keyword("TEST"));
perform("TESTING", (_) => true, (_) => { emit("TESTING!\n")});

understand("HELP", parse_keyword("HELP"));
perform("HELP", _ => true, _ => {
  emit("HERE IS A LIST OF EVERY ACTION I CAN PERFORM:\n");
  var commandNames = [];
  for (var command of COMMANDS)
    commandNames.push(command.UNDERSTAND);
  let uniqueItems = [...new Set(commandNames)]
  for (var command of uniqueItems)
    emit(command + "\n");
  emit("TRY 'HELP [ACTION]' FOR HELP ABOUT A SPECIFIC ACTION\n");
});

understand("HELP WITH", parse_sequence(parse_keyword("HELP"), parse_string("TOPIC")));
perform("HELP WITH", _ => true, _ => {
  emit("HERE IS EVERYTHING I KNOW ABOUT THE TOPIC " + _.TOPIC + "\n", null, {EXPAND: false});
  var relevantCommands = [];
  for (var command of COMMANDS)
    if (command.UNDERSTAND == _.TOPIC)
      relevantCommands.push(command);
  if (relevantCommands.length > 0) {
    emit("THERE ARE (" + relevantCommands.length + ") COMMANDS THAT I UNDERSTAND AS PERFORMING THIS ACTION.\n", null, {EXPAND: false});
    for (var command of relevantCommands)
      emit("*  " + command.PARSER.DESCRIPTION + "\n", null, {EXPAND: false});
  }
  for (var manpage of MANPAGES) 
    if (manpage.TOPIC == _.TOPIC)
      emit("\n" + manpage.HELP + "\n", null, {EXPAND: false});
});

var DEBUG_COMMAND = understand("DEBUGGING", parse_sequence(parse_keyword("X"), parse_object("OBJECT")));
perform("DEBUGGING", _ => true, _ => {
  emit("PROPERTIES OF [{OBJECT}]\n", _, {EXPAND: false, INSTANT: true});
  for (var propertyName in _.OBJECT)
    if (_.OBJECT[propertyName] instanceof GameObject)
      emit("*  " + propertyName + " : [{" + propertyName + "}]\n", _.OBJECT, {EXPAND: true, INSTANT: true})
    else
      emit("*  " + propertyName + " : " + String(_.OBJECT[propertyName]) + "\n", null, {EXPAND: false, INSTANT: true});
});

understand("DEBUGGING HERE", parse_sequence(parse_keyword("X"), parse_keyword("HERE")));
perform("DEBUGGING HERE", _ => true, _ => follow_parsed_command(DEBUG_COMMAND, { OBJECT: CURRENT_ROOM }));

understand("DEBUGGING ME", parse_sequence(parse_keyword("X"), parse_keyword("ME")));
perform("DEBUGGING ME", _ => true, _ => follow_parsed_command(DEBUG_COMMAND, { OBJECT: SELF }));

understand("RULES", parse_sequence(parse_keyword("RULES"), parse_string("RULEBOOK")));
perform("RULES", _ => true, _ => {
  emit("RULEBOOK NAMED " + _.RULEBOOK + "\n", null, {EXPAND: false, INSTANT: true});
  if (GLOBAL_RULES[_.RULEBOOK] === undefined) 
    emit("UNDEFINED\n", null, {EXPAND: false, INSTANT: true});
  else {
    for (var rule of GLOBAL_RULES[_.RULEBOOK].INSTEAD_RULES)
      emit("INSTEAD WHEN [" + String(rule.WHEN) + "] THEN [" + String(rule.EXEC) + "]\n", null, {EXPAND: false, INSTANT: true});
    for (var rule of GLOBAL_RULES[_.RULEBOOK].PERFORM_RULES)
      emit("PERFORM WHEN [" + String(rule.WHEN) + "] THEN [" + String(rule.EXEC) + "]\n", null, {EXPAND: false, INSTANT: true});
  }
});

understand("RULEBOOKS", parse_keyword("RULEBOOKS"));
perform("RULEBOOKS", _ => true, _ => {
  emit("ALL RULEBOOKS:\n", null, {EXPAND: false, INSTANT: true});
  for (var rulebookName in GLOBAL_RULES)
    emit(rulebookName + "\n", null, {EXPAND: false, INSTANT: true});
});

understand("LOOKING HERE", parse_keyword("LOOK"));
understand("LOOKING HERE", parse_sequence(parse_keyword("LOOK"), parse_keyword("HERE")));
understand("LOOKING HERE", parse_keyword("L"));
understand("LOOKING HERE", parse_sequence(parse_keyword("L"), parse_keyword("HERE")));

perform("LOOKING HERE", (_) => true, (_) => {
  emit("## SCANNING LOCATION.....\n");
  consider("DESCRIBING", CURRENT_ROOM);
  emit("\n");
  if (CURRENT_ROOM.CONTENTS.length > 0) {
    emit("STUFF HERE:\n");
    for(var item of CURRENT_ROOM.CONTENTS) {
      emit("*  {ITEM}\n", {ITEM: item});
    }
  }

  if (CURRENT_ROOM.LINKS.length > 0) {
    emit("YOU CAN GO:\n");
    for(var link of CURRENT_ROOM.LINKS) {
      if (link.DOOR) 
        emit("*  " + link.DIRECTION + " [THROUGH {DOOR}]\n", link);
      else
        emit("*  " + link.DIRECTION + "\n");
    }
  }
});

understand("LOOKING AT", parse_sequence(parse_keyword("LOOK"), parse_keyword("AT"), parse_object("OBJECT")));
understand("LOOKING AT", parse_sequence(parse_keyword("L"), parse_keyword("AT"), parse_object("OBJECT")));
understand("LOOKING AT", parse_sequence(parse_keyword("LOOK"), parse_object("OBJECT")));
understand("LOOKING AT", parse_sequence(parse_keyword("L"), parse_object("OBJECT")));

perform("LOOKING AT", (_) => true, (_) => {
  emit("## SCANNING [{OBJECT}]\n", _);
  consider("DESCRIBING", _.OBJECT);
  emit("\n");

  var items_on = get_contents(_.OBJECT, "ON");
  if (items_on.length > 0) {
    emit("ON IT IS:\n");
    for (var item of items_on)
      emit("*  {ITEM}\n", {ITEM: item});
  }

  if (_.OBJECT.CONTAINER == true) {
    if (_.OBJECT.OPEN != false) {
      var items_inside = get_contents(_.OBJECT, "IN");
      if (items_inside.length > 0) {
        emit("IT IS OPEN. INSIDE:\n");
        for(var item of items_inside) {
          emit("*  {ITEM}\n", {ITEM: item});
        }
      }
      else
        emit("IT IS OPEN, AND ALSO EMPTY.\n");
    }
    else
      emit("IT IS CLOSED.\n");
  }
});

var LOOK_INSIDE = understand("LOOKING IN", parse_sequence(parse_keyword("LOOK"), parse_keyword("IN"), parse_object("OBJECT")));

instead("LOOKING IN", (_) => _.OBJECT.CONTAINER != true, _ => emit("The concept of \"in\" doesn't seem to apply to that\n"));
instead("LOOKING IN", (_) => _.OBJECT.OPEN == false, _ => emit("It's closed\n"));
perform("LOOKING IN", _ => true, _ => {
  emit("INSIDE [{OBJECT}] IS:\n", _);
  var items = get_contents(_.OBJECT, "IN");
  if (items.length == 0)
    emit("...NOTHING!\n");
  else
    for(var item of items) {
      emit("*  {ITEM}\n", {ITEM: item});
  }
});

understand("LISTING INVENTORY", parse_alternative(parse_keyword("I"), parse_keyword("INV"), parse_keyword("INVENTORY")));
understand("LISTING INVENTORY", parse_sequence(parse_keyword("LOOK"), parse_keyword("ME")));
understand("LISTING INVENTORY", parse_sequence(parse_keyword("L"), parse_keyword("ME")));

perform("LISTING INVENTORY", (_) => true, (_) => {
  consider("DESCRIBING", SELF);
  emit("\n");
  if (SELF.hasOwnProperty("CONTENTS")) {
    emit("You got:\n");
    if (SELF.CONTENTS.length == 0)
      emit("...NOTHING!\n");
    else
      for(var item of SELF.CONTENTS) {
        emit("*  {ITEM}\n", {ITEM: item});
    }
  }
});

understand("PUSHING", parse_sequence(parse_keyword("PUSH"), parse_object("OBJECT")));
instead("PUSHING", _ => true, _ => emit("Doesn't seem to do anything\n"));

understand("TAKING", parse_sequence(parse_keyword("GET"), parse_object("OBJECT")));
understand("TAKING", parse_sequence(parse_keyword("TAKE"), parse_object("OBJECT")));

instead("TAKING", (_) => _.OBJECT.FIXED == true, (_) => { emit("That is firmly attached, you couldn't possibly take it.\n"); });
instead("TAKING", _ => _.OBJECT.LOCATION === SELF, _ => emit("YOU ALREADY HAVE THAT.\n"));

perform("TAKING", (_) => true, (_) => {
  emit("Taking the {OBJECT}\n", _);
  move_object(_.OBJECT, SELF);
});

understand("DROPPING", parse_sequence(parse_keyword("DROP"), parse_object("OBJECT")));
understand("DROPPING", parse_sequence(parse_keyword("DISCARD"), parse_object("OBJECT")));

instead("DROPPING", _ => _.OBJECT.LOCATION !== SELF, _ => emit("You aren't holding that.\n"));
perform("DROPPING", _ => true, _ => {
  emit("DROPPING THE {OBJECT}\n", _);
  move_object(_.OBJECT, CURRENT_ROOM);
});

understand("PUTTING", parse_sequence(parse_keyword("PUT"), parse_object("OBJECT"), parse_relloc("RELATIVE_LOCATION"), parse_object("LOCATION")));
instead("PUTTING", _ => _.RELATIVE_LOCATION == "IN" && _.LOCATION.CONTAINER != true, "YOU CAN'T PUT THINGS INSIDE THAT\n");
instead("PUTTING", _ => _.RELATIVE_LOCATION == "IN" && _.LOCATION.OPEN == false, "YOU WOULD HAVE TO OPEN IT FIRST\n");
instead("PUTTING", _ => _.RELATIVE_LOCATION == "ON" && _.LOCATION.SUPPORTER != true, "YOU CAN'T PUT THINGS ON THAT\n");
perform("PUTTING", _ => true, _ => {
  emit("PUTTING THE {OBJECT} {RELATIVE_LOCATION} THE {LOCATION}\n", _);
  move_object(_.OBJECT, _.LOCATION, _.RELATIVE_LOCATION);
});

var UNLOCK_COMMAND = understand("UNLOCKING", parse_sequence(parse_keyword("UNLOCK"), parse_object("OBJECT")));

instead("UNLOCKING", _ => _.OBJECT.LOCKED === undefined, _ => emit("That isn't something that can be locked in the first place.\n"));
instead("UNLOCKING", _ => _.OBJECT.LOCKED === false, _ => emit("It's already unlocked.\n"));
perform("UNLOCKING", _ => true, _ => {
  emit("UNLOCKING [{OBJECT}]\n", _);
  _.OBJECT.LOCKED = false;
});

var COMMAND_OPEN = understand("OPENING", parse_sequence(parse_keyword("OPEN"), parse_object("OBJECT")));

instead("OPENING", (_) => _.OBJECT.OPEN === undefined, (_) => {
  emit ("You can't open that.\n");
  _.COMMAND_FAILED = true;
});

perform("OPENING", _ => _.OBJECT.LOCKED == true, _ => {
  emit("[FIRST UNLOCKING THE {OBJECT}]\n", _);
  var unlock_failed = follow_parsed_command(UNLOCK_COMMAND, _);
  if (unlock_failed)
    return RULE_RESULT.ABORT;
});

perform("OPENING", (_) => true, (_) => {
  emit("OPENING THE {OBJECT}\n", _);
  _.OBJECT.OPEN = true;
  if (_.OBJECT.CONTAINER == true)
    follow_parsed_command(LOOK_INSIDE, _);
})

var CLOSE_COMMAND = understand("CLOSING", parse_sequence(parse_keyword("CLOSE"), parse_object("OBJECT")));

instead("CLOSING", _ => _.OBJECT.OPEN === undefined, _ => {
  emit ("That isn't something that can be open or closed\n");
  _.COMMAND_FAILED = true;
});

instead("CLOSING", _ => _.OBJECT.OPEN == false, _ => emit("IT'S ALREADY CLOSED"));

perform("CLOSING", _ => true, _ => {
  emit("CLOSING THE {OBJECT}\n", _);
  _.OBJECT.OPEN = false;
})


understand("GOING", parse_sequence(parse_keyword("GO"), parse_direction("DIRECTION")));
understand("GOING", parse_direction("DIRECTION"));

instead("GOING", (_) => CURRENT_ROOM.get_link(_.DIRECTION) == null, (_) => { emit("You can't go that way.\n"); });

perform("GOING", (_) => {
  if (CURRENT_ROOM.get_link(_.DIRECTION).DOOR == null) return false;
  if (CURRENT_ROOM.get_link(_.DIRECTION).DOOR.OPEN == true) return false;
  return true;
},
  (_) => { 
    emit("[First opening the {DOOR}]\n", CURRENT_ROOM.get_link(_.DIRECTION));
    var fake_parse = { OBJECT: CURRENT_ROOM.get_link(_.DIRECTION).DOOR };
    var open_failed = follow_parsed_command(COMMAND_OPEN, fake_parse);
    if (open_failed)
      return RULE_RESULT.ABORT;
  });

perform("GOING", (_) => true, (_) => {
  emit("Going " + _.DIRECTION + "\n");
  CURRENT_ROOM = CURRENT_ROOM.get_link(_.DIRECTION).DESTINATION;
  follow_command("LOOK");
});

understand("USING ON", parse_sequence(parse_keyword("USE"), parse_object("TOOL"), parse_keyword("ON"), parse_object("TARGET")));
understand("USING ON", parse_sequence(parse_keyword("USE"), parse_object("TOOL"), parse_keyword("WITH"), parse_object("TARGET")));

instead("USING ON", _ => true, _ => emit("I don't know how to do that.\n")).last();
