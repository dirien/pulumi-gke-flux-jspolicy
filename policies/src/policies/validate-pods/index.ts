import {V1Pod} from "@kubernetes/client-node";
import {denyDefaultNamespace, denyLatestTag, denyRootUserPod, validateImageRegistry} from "../../lib";


const pod = request.object as V1Pod;

let errors = [];

let error = denyDefaultNamespace(pod);
if (error.length > 0) {
  deny(error);
}

errors = denyLatestTag(pod.spec!);
if (errors.length > 0) {
  deny(errors.join(","))
}
errors = denyRootUserPod(pod.spec!);
if (errors.length > 0) {
  deny(errors.join(","))
}

errors = validateImageRegistry(pod.spec!, "^docker.repo.schwarz/.*");

if (errors.length > 0) {
  warn("Your request has following violations: " + errors.join(","));
}


