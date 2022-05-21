import * as pulumi from "@pulumi/pulumi";
import * as gce from "@pulumi/google-native";
import * as random from "@pulumi/random";

const config = new pulumi.Config("google-native");
const project = config.require("project");

const nodeConfig: gce.types.input.container.v1.NodeConfigArgs = {
  machineType: "e2-standard-4",
  oauthScopes: [
    "https://www.googleapis.com/auth/compute",
    "https://www.googleapis.com/auth/devstorage.read_only",
    "https://www.googleapis.com/auth/logging.write",
    "https://www.googleapis.com/auth/monitoring",
  ],
};

const password = new random.RandomPassword("password", {
  length: 16,
  special: false,
});

const gke = new gce.container.v1.Cluster("gke-cluster", {
  name: "gke-cluster",
  location: "europe-west3",
  initialClusterVersion: "1.23.5-gke.2400",
  nodePools: [{
    config: nodeConfig,
    initialNodeCount: 1,
    management: {
      autoRepair: false,
    },
    name: "initial",
  }],
})

const token = gce.authorization.getClientToken();

const fluxSA = new gce.iam.v1.ServiceAccount("flux-iam", {
  accountId: "flux-iam",
  project: project,
})

const fluxIam = new gce.iam.v1.ServiceAccountIamPolicy("flux-iam-policy", {
  serviceAccountId: fluxSA.uniqueId,
  bindings: [{
    role: "roles/iam.serviceAccountUser",
    members: [pulumi.interpolate`serviceAccount:${fluxSA.email}`],
  }],
})


const fluxKey = new gce.iam.v1.Key("flux-iam-key", {
  serviceAccountId: fluxSA.uniqueId,
})

const bucket = new gce.storage.v1.Bucket("flux-bucket", {
  name: `${project}-flux-bucket`,
  location: "europe-west3",
  predefinedAcl: "projectPrivate",
})


new gce.storage.v1.BucketIamPolicy("flux-bucket-policy", {
  bucket: bucket.name,
  bindings: [{
    role: "roles/storage.admin",
    members: [
      pulumi.interpolate`serviceAccount:${fluxSA.email}`,
      pulumi.interpolate`user:engin.diri@gmail.com`
    ],
  }],
})


const kubeConfig = pulumi.all([gke.name, gke.endpoint, gke.masterAuth, token]).apply(
    ([name, endpoint, auth,token]) => {
      const context = `${project}_${name}`;
      return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: "admin"
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: "admin"
  user:
    token: ${token.accessToken}
`;
    });

export const kubeconfig = pulumi.secret(kubeConfig);
export const bucketName = bucket.name;
export const bucketRegion = bucket.location;
export const privateKeyData = pulumi.secret(fluxKey.privateKeyData)
