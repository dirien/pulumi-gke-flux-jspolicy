import {V1Container, V1ObjectMeta, V1PodSpec} from "@kubernetes/client-node";

export const latestNotAllowed = "Latest tag is not allowed."
export const tagIsRequired = "An image tag is required."

export function denyCustom(msg: string): void {
  deny(msg);
}

export function denyDefaultNamespace(request: { metadata?: V1ObjectMeta }): string {
  if (request.metadata?.namespace === 'default') {
    return "Namespace is default";
  }
  return "";
}

export function denyLatestTag(pod: V1PodSpec): string[] {
  const errors: string[] = [];
  pod.containers?.forEach((container: V1Container, index: number) => {
    if (container.image?.match(new RegExp(".+:.+"))?.length != 1) {
      errors.push(tagIsRequired);
    }
    if (container.image?.match(new RegExp(".+:latest"))?.length == 1) {
      errors.push(latestNotAllowed);
    }
  })
  return errors;
}

export function denyRootUserPod(pod: V1PodSpec): string[] {
  const errors: string[] = [];
  if (pod.securityContext?.runAsUser == 0) {
    errors.push("Root user is not allowed in pod.");
  }
  pod.containers?.forEach((container: V1Container, index: number) => {
    if (container.securityContext?.runAsUser == 0) {
      errors.push("Root user is not allowed in container.");
    }
  })
  return errors;
}

export function addLabelToMetaData(request: { metadata?: V1ObjectMeta }, label: string, value: string): { metadata?: V1ObjectMeta } {
  if (request?.metadata!) {
    if (!request.metadata.labels) {
      request.metadata.labels = {};
    }
    request.metadata.labels[label] = value;
  }

  return request
}


export function validateImageRegistry(pod: V1PodSpec, allowedImagePattern: string): string[] {
  const allowedImageRegex = new RegExp(allowedImagePattern)

  const errors: string[] = [];

  pod.containers?.forEach((container: V1Container, index: number) => {
    if (container.image?.match(allowedImageRegex)?.length != 1) {
      errors.push("Field spec.containers[" + index + "].image must match regex: " + allowedImagePattern)
    }
  })

  pod.initContainers?.forEach((container: V1Container, index: number) => {
    if (container.image?.match(allowedImageRegex)?.length != 1) {
      errors.push("Field spec.initContainers[" + index + "].image must match regex: " + allowedImagePattern)
    }
  })


  return errors;
}
