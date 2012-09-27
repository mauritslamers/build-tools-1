build-tools
===========

SproutCore Build Tools (as of 2.0)


Derived from the nodejs buildtools named Garçon (https://github.com/martoche/garcon), 
these build tools have been rewritten using Sproutcore. 
Support for Chance is now implemented, as well as for modules (called bundles in the code).

This means this build-tools (codename garçon) should support everything the abbot buildtools support.
In addition the following is supported:

- multiple non-blocking proxies
- auto-reloading in case of newly created files or directories


These build-tools are not finished yet and some major changes will be made in the future.
Info on this can be found in the TODO file.
Hacking on the build tools can be best done using this ready-made environment:

https://github.com/mauritslamers/garcon-testproject

Any project you want to test against can be put inside this project.
