# KVM 1 deployment

Pushes to master run locked dependency installation and source syntax validation. Successful checks deploy the exact tested commit to inryde-backend. Pull requests validate without deployment. A manual Actions run on master can retry a deployment.

The VPS uses a dedicated forced-command SSH key per repository, pinned host identity, and a global deployment lock. Dependencies install in a temporary directory before changing the running checkout. Server .env and credentials are preserved; changes to tracked configuration require separate review. A failed startup or HTTP health check restores the previous commit and dependency tree. There is a brief service interruption during PM2 restart. HTTP checks confirm availability, not complete business-function coverage.

The root-owned /usr/local/sbin/kvm1-deploy script is installed from ops/kvm1-deploy.sh; updating this file in Git alone does not update the server copy. GitHub secrets KVM1_DEPLOY_KEY and KVM1_KNOWN_HOSTS are required. The restricted key accepts only deploy followed by a 40-character commit SHA, for this repository alone. Production environment variables and payment keys stay on the VPS.
