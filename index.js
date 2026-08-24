/* Railpack / Railway entry for the auto-imported `mobile` service.
   api and web deploy from Dockerfiles and never execute this file.
   Mobile's dashboard builder is Railpack, which requires a root start
   (the root package is a workspace, not an app). */
require("./apps/mobile/server.js");
