import {V1Deployment} from "@kubernetes/client-node";
import {denyDefaultNamespace, denyLatestTag, denyRootUserPod, validateImageRegistry} from "../../lib";


const deployment = request.object as V1Deployment;

let errors = [];

let error = denyDefaultNamespace(deployment);
if (error.length > 0) {
  deny(error);
}

errors = denyLatestTag(deployment.spec?.template.spec!);
if (errors.length > 0) {
  deny(errors.join(","))
}
errors = denyRootUserPod(deployment.spec?.template.spec!);
if (errors.length > 0) {
  deny(errors.join(","))
}
errors = validateImageRegistry(deployment.spec?.template.spec!, "^docker.repo.schwarz/.*");
if (errors.length > 0) {
  warn("Your request has following violations: " + errors.join(","));
}

