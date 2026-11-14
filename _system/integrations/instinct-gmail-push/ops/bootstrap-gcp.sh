#!/usr/bin/env bash
# CC-A2A-GMAIL-PUSH-001 — run from the *owner's* authenticated Google Cloud Shell.
# Idempotent infrastructure staging only; does not create an HTTPS endpoint,
# obtain Gmail OAuth, start Gmail watch, send mail, or enable ChatGPT wake-up.
set -Eeuo pipefail

PROJECT_ID="instinct-514702"
PROJECT_NUMBER="1086523772609"
TOPIC="instinct-gmail-events"
PUSH_ID="instinct-pubsub-push"
PUSH_SA="${PUSH_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
PUBSUB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

echo "Checking owner-selected Google project..."
gcloud projects describe "${PROJECT_ID}" --format="table(projectId,projectNumber,lifecycleState)"
ACTUAL_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
if [[ "${ACTUAL_NUMBER}" != "${PROJECT_NUMBER}" ]]; then
  echo "ERROR: project number mismatch; aborting without changes." >&2; exit 1
fi
echo "Target: ${PROJECT_ID}, number ${PROJECT_NUMBER}"
echo "This may enable billable cloud APIs. No billing account will be attached by this script."
read -r -p "Type ACTIVATE to enable APIs and configure Pub/Sub for this exact project: " ACK
[[ "${ACK}" == "ACTIVATE" ]] || { echo "Cancelled."; exit 2; }

gcloud services enable gmail.googleapis.com pubsub.googleapis.com iam.googleapis.com \
  --project="${PROJECT_ID}"

if ! gcloud pubsub topics describe "${TOPIC}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud pubsub topics create "${TOPIC}" --project="${PROJECT_ID}"
fi

gcloud pubsub topics add-iam-policy-binding "${TOPIC}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" --quiet

if ! gcloud iam service-accounts describe "${PUSH_SA}" \
    --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${PUSH_ID}" \
    --project="${PROJECT_ID}" \
    --display-name="Instinct authenticated PubSub push sender"
fi

# Least privilege: grant token minting on the single target service account,
# not across all service accounts in the project.
gcloud iam service-accounts add-iam-policy-binding "${PUSH_SA}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${PUBSUB_AGENT}" \
  --role="roles/iam.serviceAccountTokenCreator" --quiet

echo
echo "GCP bootstrap finished. Resource references:"
echo "PROJECT=${PROJECT_ID}"
echo "TOPIC=projects/${PROJECT_ID}/topics/${TOPIC}"
echo "SUBSCRIPTION_PLANNED=projects/${PROJECT_ID}/subscriptions/instinct-gmail-push"
echo "PUSH_SERVICE_ACCOUNT=${PUSH_SA}"
echo
echo "PENDING GATES:"
echo "- Deploy the merged Node bridge behind an owner-controlled HTTPS URL."
echo "- Configure Gmail OAuth with gmail.readonly and a private refresh token."
echo "- Only then create authenticated push subscription to that live URL."
echo "- Run CLI watch, register, bootstrap; verify a Google-signed push."
echo "- Set a notification destination; this cannot wake the exact ChatGPT thread."
echo
echo "No subscription, Gmail watch, OAuth credential, deployment or spend authorization was created by this script."
