import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";
import * as pulumi from "@pulumi/pulumi";


const infra = new pulumi.StackReference("dirien/00-gke/dev");
const kubeconfig = infra.getOutput("kubeconfig");

const provider = new k8s.Provider("k8s", {
  kubeconfig: kubeconfig,

});

const fluxNS = new k8s.core.v1.Namespace("flux", {
  metadata: {
    name: "flux-system",
  },
}, {
  provider: provider
});

const fluix = new k8s.helm.v3.Release("flux2", {
  name: "flux2",
  chart: "flux2",
  version: "0.19.2",
  namespace: fluxNS.metadata.name,
  repositoryOpts: {
    repo: "https://fluxcd-community.github.io/helm-charts"
  },
}, {
  provider: provider
})

const bucketSecret = new k8s.core.v1.Secret("bucket-secret", {
  metadata: {
    name: "bucket-secret",
    namespace: fluxNS.metadata.name,
  },
  type: "Opaque",
  data: {
    "serviceaccount": infra.getOutput("privateKeyData")
  },
}, {
  provider: provider,
  parent: fluix
});

const bucketCR = new k8s.apiextensions.CustomResource("flux-bucket", {
      metadata: {
        name: "flux-bucket",
        namespace: fluxNS.metadata.name,
      },
      apiVersion: "source.toolkit.fluxcd.io/v1beta2",
      kind: "Bucket",
      spec: {
        interval: "1m0s",
        provider: "gcp",
        bucketName: infra.getOutput("bucketName"),
        endpoint: "storage.googleapis.com",
        region: infra.getOutput("bucketRegion"),
        secretRef: {
          name: bucketSecret.metadata.name
        }
      },
    }, {
      provider: provider,
      parent: fluix
    }
)

const service = new k8s.apiextensions.CustomResource("demo-services", {
  metadata: {
    name: "demo-services",
    namespace: fluxNS.metadata.name,
  },
  apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
  kind: "Kustomization",
  spec: {
    interval: "1m0s",
    path: "./services",
    prune: true,
    sourceRef: {
      kind: bucketCR.kind,
      name: bucketCR.metadata.name,
      namespace: fluxNS.metadata.name,
    }
  },
}, {
  provider: provider,
  parent: fluix
})

const compliance = new k8s.apiextensions.CustomResource("demo-compliance", {
  metadata: {
    name: "demo-compliance",
    namespace: fluxNS.metadata.name,
  },
  apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
  kind: "Kustomization",
  spec: {
    interval: "1m0s",
    path: "./compliance",
    prune: true,
    dependsOn: [
      {
        name: service.metadata.name
      }
    ],
    healthChecks: [
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: "jspolicy",
        namespace: fluxNS.metadata.name,
      }
    ],
    sourceRef: {
      kind: bucketCR.kind,
      name: bucketCR.metadata.name,
      namespace: fluxNS.metadata.name,
    }
  },
}, {
  provider: provider,
  parent: fluix
})

const policies = new k8s.apiextensions.CustomResource("demo-policies", {
  metadata: {
    name: "demo-policies",
    namespace: fluxNS.metadata.name,
  },
  apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
  kind: "Kustomization",
  spec: {
    interval: "1m0s",
    path: "./policies",
    prune: true,
    dependsOn: [
      {
        name: compliance.metadata.name
      }
    ],
    sourceRef: {
      kind: bucketCR.kind,
      name: bucketCR.metadata.name,
      namespace: fluxNS.metadata.name,
    }
  },
}, {
  provider: provider,
  parent: fluix
})

new k8s.apiextensions.CustomResource("demo-applications", {
  metadata: {
    name: "demo-applications",
    namespace: fluxNS.metadata.name,
  },
  apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
  kind: "Kustomization",
  spec: {
    interval: "1m0s",
    path: "./applications",
    prune: true,
    dependsOn: [
      {
        name: compliance.metadata.name
      },
      {
        name: service.metadata.name
      },
      {
        name: policies.metadata.name
      }
    ],
    sourceRef: {
      kind: bucketCR.kind,
      name: bucketCR.metadata.name,
      namespace: fluxNS.metadata.name,
    }
  },
}, {
  provider: provider,
  parent: fluix
})
