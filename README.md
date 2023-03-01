# JSIF
Javascript Interactive Fiction library

JSIF is a stand-alone javascript library for writing parser interactive fiction. I am a big fan of the way Inform7 works as a game engine, but not of Inform7 the programming language. So, JSIF attempts to capture the way an Inform7 game works in Javascript.

Goals:
* Capture the bare necessities for quickly writing Parser IF.
* Clear and simple game creation code.
* A single Javascript library without dependencies.
* No proprietary, obtuse programming language. (Instead it uses Javascript, which is deeply flawed in ways that annoy me less than Inform7.)

The same basic abstractions that exist in Inform7 are supported here.
You UNDERSTAND patterns as specific actions;
You write RULES to carryout those actions.
The world exists as OBJECTS, which can have contents and connections.

The example game demonstrates all the features of JSIF, and minimal.htm shows the bare minimum framework for a game. 

Creating a room:
var MYROOM = new GAMEOBJECT();

Creating an object:
var MYOBJECT = new GAMEOBJECT("MY OBJECT");

Put the object in the room:
MOVE(MYOBJECT, MYROOM)
