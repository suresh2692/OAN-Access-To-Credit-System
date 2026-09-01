// =============================================================================
//  Jenkinsfile — OAN-Access-To-Credit-System (A2C frontend, Next.js). Single
//  pipeline for the `oan-package` GitHub Organization folder (multibranch).
//
//  Per branch:
//    develop -> build + push to ECR (oan-a2c-frontend) + ci/deploy-dev.sh
//               (existing dev-VM docker-compose deploy — UNCHANGED)
//    staging -> build + push to ECR (oan/access-to-credit-system) + ci/update-kustomize-ati.sh
//               (GitOps: bump oan-kustomize `staging` overlay; ArgoCD on node 41 syncs)
//
//  develop stays on the LEGACY `oan-a2c-frontend` repo because ci/deploy-dev.sh and
//  the dev VM's .env reference it. `main` is handled separately by Jenkinsfile.main
//  (staging VM) during validation.
//
//  API_BASE_URL is baked into the Next.js image at build time (per branch):
//    develop -> the dev backend;  staging -> the on-prem backend on node 41.
//
//  Tags:  <branch>-<build>   immutable, pinned by oan-kustomize
//         <branch>-latest    moving alias
//
//  Agent needs: docker(+buildx), aws cli v2, git, kustomize.
//  Credentials: AWS_ACCOUNT_ID, frontend-uat-ssh-key, FRONTEND_UAT_IP, oan-deployer.
// =============================================================================
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    AWS_REGION           = 'ap-south-1'
    DEV_API_BASE_URL     = 'https://a2c-backend-development.oanstaging.com'
    STAGING_API_BASE_URL = 'https://a2c.ati-staging.internal'   // on-prem backend on node 41
  }

  stages {
    stage('Resolve') {
      steps {
        script {
          // staging -> new namespaced repo + on-prem backend; else -> legacy (unchanged).
          env.ECR_REPO      = (env.BRANCH_NAME == 'staging_ati') ? 'oan/access-to-credit-system' : 'oan-a2c-frontend'
          env.API_BASE_URL  = (env.BRANCH_NAME == 'staging_ati') ? env.STAGING_API_BASE_URL : env.DEV_API_BASE_URL
          env.IMMUTABLE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
          env.MOVING_TAG    = "${env.BRANCH_NAME}-latest"
          echo "branch=${env.BRANCH_NAME}  repo=${env.ECR_REPO}  tag=${env.IMMUTABLE_TAG}  api=${env.API_BASE_URL}"
        }
      }
    }

    stage('Build image') {
      when { anyOf { branch 'develop'; branch 'staging_ati' } }
      steps {
        withCredentials([string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
            # --no-cache: never reuse a layer from an earlier build on this
            #   shared agent, so every image is built from the checked-out tree.
            # --pull: re-resolve the `node:24` base rather than building on a
            #   copy the agent may have cached weeks ago, which would keep the
            #   image pinned to an unpatched base indefinitely.
            DOCKER_BUILDKIT=1 docker build \
              --no-cache --pull \
              --build-arg API_BASE_URL="${API_BASE_URL}" \
              --tag ${IMAGE_URI}:${IMMUTABLE_TAG} \
              --tag ${IMAGE_URI}:${MOVING_TAG} \
              .
            echo "Built ${IMAGE_URI}:${IMMUTABLE_TAG}"
          '''
        }
      }
    }

    stage('Push to ECR') {
      when { anyOf { branch 'develop'; branch 'staging_ati' } }
      steps {
        withCredentials([string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
            IMAGE_URI="${REGISTRY}/${ECR_REPO}"
            aws ecr get-login-password --region ${AWS_REGION} \
              | docker login --username AWS --password-stdin "${REGISTRY}"
            docker push ${IMAGE_URI}:${IMMUTABLE_TAG}
            docker push ${IMAGE_URI}:${MOVING_TAG}
            # Scoped cleanup only — never `docker system prune -f` on a shared agent.
            docker rmi ${IMAGE_URI}:${IMMUTABLE_TAG} ${IMAGE_URI}:${MOVING_TAG} || true
            echo "Pushed ${IMAGE_URI}:${IMMUTABLE_TAG} (+ ${MOVING_TAG})"
          '''
        }
      }
    }

    // ---------------------- per-branch deploy ----------------------

    stage('develop → dev VM') {
      when { branch 'develop' }
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID'),
          sshUserPrivateKey(credentialsId: 'frontend-uat-ssh-key',
                            keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER'),
          string(credentialsId: 'FRONTEND_UAT_IP', variable: 'DEV_IP')
        ]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            chmod +x ci/deploy-dev.sh
            AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID} SSH_KEY=${SSH_KEY} SSH_USER=${SSH_USER} DEV_IP=${DEV_IP} \
            AWS_REGION=${AWS_REGION} ECR_REPO=${ECR_REPO} IMAGE_TAG=${IMMUTABLE_TAG} API_BASE_URL=${API_BASE_URL} \
            bash ci/deploy-dev.sh
          '''
        }
      }
    }

    // staging -> GitOps: bump apps/access-to-credit-system/overlays/staging in oan-kustomize.
    // Auth is the `oan-deployer` GitHub App (contents:write on oan-kustomize only).
    stage('staging → GitOps (ArgoCD@41)') {
      when { branch 'staging_ati' }
      steps {
        withCredentials([
          string(credentialsId: 'AWS_ACCOUNT_ID', variable: 'AWS_ACCOUNT_ID'),
          gitUsernamePassword(credentialsId: 'oan-deployer', gitToolName: 'Default')
        ]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            chmod +x ci/update-kustomize-ati.sh
            # args: <overlay> <kustomize image match-name> <new image ref>
            ci/update-kustomize-ati.sh staging access-to-credit-system \
              "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMMUTABLE_TAG}"
          '''
        }
      }
    }
  }

  post {
    success { echo "OK  ${env.BRANCH_NAME} #${env.BUILD_NUMBER} -> ${env.IMMUTABLE_TAG}" }
    failure { echo "FAIL ${env.BRANCH_NAME} #${env.BUILD_NUMBER}" }
  }
}
