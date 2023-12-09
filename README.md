# Bitburner Game Scripts

This repository is for my personal use in the game "Bitburner". It contains code that I use to automate certain tasks in the game.

I did not create the original code used to connect this repository to the game. The original repository can be found here:
https://github.com/bitburner-official/typescript-template

To anyone reading this, feel free to fork this repo or copy/paste the scripts I have here. I will try to keep this repository updated and well organized as I progress through the game.

## File Structure

All the files in `src` are served, and everything in `src` is contained in a single `fs` directory (save for `/lib/react.js`). This is meant to avoid accidentally overwriting any other scripts in-game. For the following structure (heavily inspired by linux), assume a prefix of `fs` in-game (e.g. `fs/usr/bin/hello-world.js`).

### /bin - Essential user binaries.

- These are scripts that are useful at the system level.
- In spirit of the game, this is where "binaries" such as weaken will live.

### /boot - Files for starting an OS process.

- Traditionally, this is where kernel files are stored. In this instance, this will be the location for any OS I build. Helpful for when I want something to boot when I start up the game.

### /etc - Configuration files.

- If there's a default configuration outside of memory sor a system-wide application, this is where it will live.
- Typically text files, unless I can store as JSON or something.

### /home - Home folders.

- Anything the player would store as a user, like journals or info files, go here.

### /lib - Essential shared libraries.

- Classes, functions, utilities used system-wide. Examples include print and list functions.
- Should serve the /bin and /sbin directories. Anything in /usr/bin should live in /usr/lib.

### /mnt - File system mounts.

- TODO: Implement a method to mount other server file structures to the home server.

### /run - Application state files.

- Like /tmp, but not cleared regularly. Better for storing transient files related to applications.
- Example: port connection information, transient state between processes.

### /sbin - System admin binaries.

- Traditionally, binaries that live here are those that affect the system overall.
  - In spirit of the game, most Singularity scripts will be stored here and `/usr/sbin`.

### /tmp - Temporary files.

- Files here will be deleted whenever the system is restarted. Great for short-lived files.
- Example: cross-process data transfer files.

### /usr - User binaries.

- A read-only place to store non-essential binaries/scripts.
  - /usr/bin: Non-essential binaries/scripts
  - /usr/lib: Library for /usr/bin and /usr/sbin
  - /usr/sbin: Non-essential system-admin binaries/scripts.

### var - Variable data files.

- The write location for anything in /usr.
- Example: log files will be written to /var/log
