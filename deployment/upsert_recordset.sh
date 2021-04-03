#! /bin/bash

usage() {
  cat << EOF
${0} recordname recordtype recordvalue

Example:
  ${0} host001.acme.com A \$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4/)

  The above command will add a A record to the hostedzone example.com, the value of the record
  is the ipv4 address of the ec2 instance

EOF
}

name_to_hostedzone() {
  name=${1}
  name=${name%.}  ### Remove trailing dot
  name=${name#*.} ### Remove first part of name to obtain domain
  name="${name}." ### Add trailing dot because that's how the domain is in Route53

  aws route53 list-hosted-zones | jq -r ".[] | map(select(.Name==\"${name}\")) | .[] .Id"
}

create_batch_file() {
  name=${1}
  rectype=${2}
  val=${3}
cat > /tmp/batch.json << EOF
{
  "Comment": "Create or update a Record Set in a hosted zone",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${name}",
        "Type": "${rectype}",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "${val}"
          }
        ]
      }
    }
  ]
}
EOF
}

if [[ $# -ne 3 ]]
then
  usage
  exit 1
fi

create_batch_file ${@}
aws route53 change-resource-record-sets \
        --hosted-zone-id $(name_to_hostedzone ${1}) \
        --change-batch file:///tmp/batch.json