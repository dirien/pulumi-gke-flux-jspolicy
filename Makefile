GKE_DIR=infrastructure/00-gke
FLUX_DIR=infrastructure/01-flux
JS_POLICY_DIR=policies

STACK_NAME=dev

.PHONY: destroy
destroy:
	@echo "Destroying..."
	@pulumi destroy --cwd $(GKE_DIR) -y
	@pulumi stack rm $(STACK_NAME) --cwd $(FLUX_DIR) --force -y

.PHONY: bootstrap
bootstrap:
	@echo "Bootstrapping Linode..."
	cd $(GKE_DIR) && npm install
	@pulumi stack select --cwd $(GKE_DIR) $(STACK_NAME)
	@pulumi up --cwd $(GKE_DIR) --skip-preview -y
	@pulumi stack output kubeconfig --show-secrets --cwd $(GKE_DIR) > kubeconfig.yaml

	@echo "Bootstrapping Flux..."
	cd $(FLUX_DIR) && npm install
	@pulumi stack select --cwd $(FLUX_DIR) $(STACK_NAME)
	@pulumi up --cwd $(FLUX_DIR) --skip-preview -y

	@echo "Compile jsPolicy Policies..."
	cd $(JS_POLICY_DIR) && npm install &&  npm run test && npm run compile-clean

.PHONY: reconcile-bucket
reconcile-bucket:
	@flux reconcile source bucket flux-bucket --kubeconfig=kubeconfig.yaml


.PHONY: check-bucket
check-bucket:
	@flux get sources bucket --kubeconfig=kubeconfig.yaml

.PHONY: upload-gcp
upload-gcp:
	$(eval BUCKET = $(shell pulumi stack output bucketName --cwd $(GKE_DIR)))

	@echo "Run following commands to upload deploy folder to the GCP bucket"
	@echo "gsutil cp -r deploy/** gs://$(BUCKET)"
