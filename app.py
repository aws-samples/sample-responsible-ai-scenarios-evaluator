import aws_cdk
from cdk.storage import StorageStack
from cdk.webapphosting import WebAppHostingStack
from cdk.api import APIStack
from cdk.compute import ComputeStack
from cdk.network import NetworkStack

from aws_cdk import Aspects # for CDK NAG
import cdk_nag # for CDK NAG
from cdk_nag import NagSuppressions # for CDK NAG

app = aws_cdk.App()

storage_stack = StorageStack(app, "rai-01-storage")
webapphosting_stack = WebAppHostingStack(app, "rai-02-webapp")
network_stack = NetworkStack(app, "rai-03-network")
compute_stack = ComputeStack(app, "rai-04-compute", storage_stack, network_stack)
api_stack = APIStack(app, "rai-05-api", storage_stack, webapphosting_stack, compute_stack, network_stack)

Aspects.of(app).add(cdk_nag.AwsSolutionsChecks(verbose=True)) # for CDK NAG
NagSuppressions.add_stack_suppressions(webapphosting_stack, [ # for CDK NAG
    { "id": 'AwsSolutions-S1', "reason": 'Identified S3 bucket is already the server access log bucket.'},
    { "id": 'AwsSolutions-IAM4', "reason": 'Automatically created by CDK when using BucketDeployment to deploy files to an S3 bucket.'},
    { "id": 'AwsSolutions-IAM5', "reason": 'Automatically created by CDK when using BucketDeployment to deploy files to an S3 bucket.'},
    { "id": 'AwsSolutions-L1', "reason": 'Automatically created by CDK when using BucketDeployment to deploy files to an S3 bucket.'},
    { "id": 'AwsSolutions-CFR1', "reason": 'Geo restriction not required for demo purposes.'},
    { "id": 'AwsSolutions-CFR4', "reason": 'Custom cert / domain not required for demo purposes.  *.cloudfront.net only supports TLSv1.'},
])
NagSuppressions.add_stack_suppressions(network_stack, [ # for CDK NAG
    { "id": 'AwsSolutions-EC23', "reason": '"AwsSolutions-EC23" threw an error during validation. This is generally caused by a parameter referencing an intrinsic function. You can suppress the "CdkNagValidationFailure" to get rid of this error. '},
])
NagSuppressions.add_stack_suppressions(compute_stack, [ # for CDK NAG
    { "id": 'AwsSolutions-IAM5', "reason": '* required to grant create log group/log streams/put log streams.'},
])
NagSuppressions.add_stack_suppressions(api_stack, [ # for CDK NAG
    { "id": 'AwsSolutions-IAM5', "reason": '* required to grant create log group/log streams/put log streams. Also required for managing network interfaces to attach to VPC, access all objects within the web app S3 bucket, get API Gateway API key, run tasks within the evaluator task definition. '},
    { "id": 'AwsSolutions-APIG4', "reason": 'API key implemented to restrict access to APIs.  Cognito not required for demo purposes.'},
    { "id": 'AwsSolutions-COG4', "reason": 'API key implemented to restrict access to APIs.  Cognito not required for demo purposes.'},
    { "id": 'AwsSolutions-L1', "reason": 'AWS-managed custom resource Lambda function runtime is controlled by AWS CDK framework.'},
])

app.synth()
