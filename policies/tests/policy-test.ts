import {V1Namespace, V1PodSpec} from "@kubernetes/client-node";
import {addLabelToMetaData, denyLatestTag, latestNotAllowed, tagIsRequired} from "../src/lib/index";
import {denyRootUserPod} from "../dist/lib";

describe("Test mutating the metadata.labels", () => {
  test("Check containers", () => {
    const testNamespace: V1Namespace = {
      metadata: {
        name: "test-pod",
      }
    }

    const expectNamespace: V1Namespace = {
      metadata: {
        name: "test-pod",
        labels: {
          "kubernetes.io/metadata.name": "test-pod"
        }
      }
    }
    expect(addLabelToMetaData(testNamespace, "kubernetes.io/metadata.name", "test-pod")).toEqual(expectNamespace);
  });
});

describe("Test security rules", () => {
  test("Deny root user pod", () => {
    const podspec: V1PodSpec = {
      securityContext: {
        runAsUser: 0,
      },
      containers: []
    }
    expect(denyRootUserPod(podspec)).toHaveLength(1);
  });
  test("Deny root user container", () => {
    const podspec: V1PodSpec = {
      containers: [
        {
          name: "test-container",
          securityContext: {
            runAsUser: 0,
          }
        }
      ]
    }
    expect(denyRootUserPod(podspec)).toHaveLength(1);
  });
  test("Deny image without tag", () => {
    const podspec: V1PodSpec = {
      containers: [
        {
          name: "test-container",
          image: "test-image",
        }
      ]
    }
    let error = denyLatestTag(podspec);
    expect(error[0]).toBe(tagIsRequired);
  });
  test("Deny image with latest", () => {
    const podspec: V1PodSpec = {
      containers: [
        {
          name: "test-container",
          image: "test-image:latest",
        }
      ]
    }
    let error = denyLatestTag(podspec);
    expect(error[0]).toBe(latestNotAllowed);
  });
});
